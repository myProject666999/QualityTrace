package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"qualitytrace/config"
	"qualitytrace/database"
	"qualitytrace/models"
	"qualitytrace/utils"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

const (
	forwardPrefix  = "trace:forward:"
	backwardPrefix = "trace:backward:"
	hotCountPrefix = "trace:hot:count:"
)

var ctxBG = context.Background()

func recordHotAccess(key string) {
	if database.Redis == nil {
		return
	}
	cacheKey := hotCountPrefix + key
	newVal, err := database.Redis.Incr(ctxBG, cacheKey).Result()
	if err != nil {
		log.Printf("[DEBUG] Redis hot count incr skipped (not available): %v", err)
		return
	}
	database.Redis.Expire(ctxBG, cacheKey, 24*time.Hour)
	log.Printf("[DEBUG] Hot access count: %s -> %d", key, newVal)
}

func isHotBatch(batchKey string) bool {
	if database.Redis == nil {
		return false
	}
	val, err := database.Redis.Get(ctxBG, hotCountPrefix+batchKey).Int()
	if err != nil {
		return false
	}
	return val >= 3
}

func TraceForward(c echo.Context) error {
	batchNo := c.QueryParam("batchNo")
	batchID, _ := strconv.ParseUint(c.QueryParam("batchId"), 10, 64)

	if batchNo == "" && batchID == 0 {
		return utils.Fail(c, 400, "批次号或批次ID不能为空")
	}

	var prodBatch models.ProductionBatch
	if batchID > 0 {
		sql := `SELECT pb.id, pb.product_id, pb.batch_no, pb.work_order, pb.planned_qty, pb.actual_qty,
			pb.production_date, pb.production_line, pb.status, pb.created_by, pb.remark, pb.created_at, pb.updated_at,
			p.product_code, p.product_name
			FROM production_batches pb LEFT JOIN products p ON pb.product_id = p.id WHERE pb.id = ?`
		type row struct {
			models.ProductionBatch
			ProductCode string `db:"product_code"`
			ProductName string `db:"product_name"`
		}
		var r row
		if err := database.DB.Get(&r, sql, batchID); err != nil {
			log.Printf("[ERROR] get production batch by id: %v", err)
			return utils.Fail(c, 404, "生产批次不存在")
		}
		r.ProductionBatch.ProductCode = r.ProductCode
		r.ProductionBatch.ProductName = r.ProductName
		prodBatch = r.ProductionBatch
		batchNo = prodBatch.BatchNo
	} else {
		sql := `SELECT pb.id, pb.product_id, pb.batch_no, pb.work_order, pb.planned_qty, pb.actual_qty,
			pb.production_date, pb.production_line, pb.status, pb.created_by, pb.remark, pb.created_at, pb.updated_at,
			p.product_code, p.product_name
			FROM production_batches pb LEFT JOIN products p ON pb.product_id = p.id WHERE pb.batch_no = ?`
		type row struct {
			models.ProductionBatch
			ProductCode string `db:"product_code"`
			ProductName string `db:"product_name"`
		}
		var r row
		if err := database.DB.Get(&r, sql, batchNo); err != nil {
			log.Printf("[ERROR] get production batch by no: %v", err)
			return utils.Fail(c, 404, "生产批次不存在")
		}
		r.ProductionBatch.ProductCode = r.ProductCode
		r.ProductionBatch.ProductName = r.ProductName
		prodBatch = r.ProductionBatch
		batchID = prodBatch.ID
	}

	cacheKey := forwardPrefix + batchNo
	recordHotAccess(batchNo)
	fromCache := false

	if database.Redis != nil && isHotBatch(batchNo) {
		cached, err := database.Redis.Get(ctxBG, cacheKey).Result()
		if err == nil && cached != "" {
			var result models.TraceForwardResult
			if jerr := json.Unmarshal([]byte(cached), &result); jerr == nil {
				result.FromCache = true
				log.Printf("[DEBUG] Forward trace cache HIT: %s", batchNo)
				return utils.OK(c, result)
			}
		}
		log.Printf("[DEBUG] Forward trace cache MISS, loading from DB: %s", batchNo)
	}

	result := models.TraceForwardResult{
		ProdBatch: prodBatch,
		FromCache: false,
	}

	type linkRow struct {
		models.BatchMaterialLink
		MaterialBatchNo string `db:"material_batch_no"`
		MaterialName    string `db:"material_name"`
		MaterialCode    string `db:"material_code"`
	}
	linkRows := []linkRow{}
	linkSQL := `SELECT bml.id, bml.prod_batch_id, bml.material_batch_id, bml.used_qty, bml.issue_time,
		IFNULL(bml.issuer,'') AS issuer, IFNULL(bml.receiver,'') AS receiver, IFNULL(bml.remark,'') AS remark,
		mb.batch_no AS material_batch_no, m.material_name, m.material_code
		FROM batch_material_links bml
		LEFT JOIN material_batches mb ON bml.material_batch_id = mb.id
		LEFT JOIN materials m ON mb.material_id = m.id
		WHERE bml.prod_batch_id = ? ORDER BY bml.id`
	if err := database.DB.Select(&linkRows, linkSQL, batchID); err != nil {
		log.Printf("[ERROR] trace forward - links: %v", err)
	} else {
		for _, r := range linkRows {
			r.BatchMaterialLink.MaterialBatchNo = r.MaterialBatchNo
			r.BatchMaterialLink.MaterialName = r.MaterialName
			r.BatchMaterialLink.MaterialCode = r.MaterialCode
			r.BatchMaterialLink.ProdBatchNo = prodBatch.BatchNo
			result.MaterialUsed = append(result.MaterialUsed, r.BatchMaterialLink)
		}
	}

	type logRow struct {
		models.ProductionLog
		EquipCode string `db:"equip_code"`
		EquipName string `db:"equip_name"`
		ShiftName string `db:"shift_name"`
		ShiftType int    `db:"shift_type_code"`
	}
	logRows := []logRow{}
	logSQL := `SELECT pl.id, pl.prod_batch_id, pl.equipment_id, pl.shift_id, pl.process_step,
		pl.start_time, pl.end_time, IFNULL(pl.operator,'') AS operator, pl.output_qty, pl.defect_qty, IFNULL(pl.remark,'') AS remark,
		e.equip_code, e.equip_name, ws.shift_name, ws.shift_type AS shift_type_code
		FROM production_logs pl
		LEFT JOIN equipment e ON pl.equipment_id = e.id
		LEFT JOIN work_shifts ws ON pl.shift_id = ws.id
		WHERE pl.prod_batch_id = ? ORDER BY pl.start_time`
	if err := database.DB.Select(&logRows, logSQL, batchID); err != nil {
		log.Printf("[ERROR] trace forward - logs: %v", err)
	} else {
		for _, r := range logRows {
			r.ProductionLog.EquipCode = r.EquipCode
			r.ProductionLog.EquipName = r.EquipName
			r.ProductionLog.ShiftName = r.ShiftName
			r.ProductionLog.ShiftType = r.ShiftType
			result.ProcessLogs = append(result.ProcessLogs, r.ProductionLog)
		}
	}

	inspectSQL := `SELECT id, inspection_no, inspection_type, target_batch_id, target_batch_no,
		standard_id, inspect_qty, qualified_qty, defect_qty, result, inspector, inspect_time, remark
		FROM inspection_records WHERE inspection_type IN (2,3) AND target_batch_id = ? ORDER BY id`
	if err := database.DB.Select(&result.Inspections, inspectSQL, batchID); err != nil {
		log.Printf("[ERROR] trace forward - inspections: %v", err)
	}

	defectSQL := `SELECT id, defect_no, defect_type, target_batch_id, target_batch_no,
		defect_code, defect_name, defect_desc, severity, defect_qty, reporter,
		report_time, process_status, responsible, remark
		FROM defect_records WHERE defect_type IN (2,3) AND target_batch_id = ? ORDER BY id`
	if err := database.DB.Select(&result.Defects, defectSQL, batchID); err != nil {
		log.Printf("[ERROR] trace forward - defects: %v", err)
	}

	if database.Redis != nil && isHotBatch(batchNo) {
		cacheTTL := time.Duration(config.AppConfig.Redis.CacheTTL) * time.Second
		resultBytes, err := json.Marshal(result)
		if err == nil {
			setErr := database.Redis.Set(ctxBG, cacheKey, resultBytes, cacheTTL).Err()
			if setErr != nil {
				log.Printf("[DEBUG] Redis set cache skipped (not available): %v", setErr)
			} else {
				log.Printf("[DEBUG] Forward trace cached: %s (TTL=%s)", batchNo, cacheTTL)
			}
		}
	}

	log.Printf("[DEBUG] Forward trace complete: %s, materials=%d, logs=%d, inspections=%d, defects=%d, cache=%t",
		batchNo, len(result.MaterialUsed), len(result.ProcessLogs), len(result.Inspections), len(result.Defects), fromCache)
	result.FromCache = fromCache
	return utils.OK(c, result)
}

func TraceBackward(c echo.Context) error {
	batchNo := c.QueryParam("batchNo")
	batchID, _ := strconv.ParseUint(c.QueryParam("batchId"), 10, 64)

	if batchNo == "" && batchID == 0 {
		return utils.Fail(c, 400, "批次号或批次ID不能为空")
	}

	var matBatch models.MaterialBatch
	if batchID > 0 {
		sql := `SELECT mb.id, mb.material_id, mb.batch_no, mb.quantity, mb.incoming_date, mb.supplier_batch,
			mb.status, mb.warehouse, mb.inspector, mb.remark, mb.created_at, mb.updated_at,
			m.material_code, m.material_name, m.material_type, m.specification, m.supplier
			FROM material_batches mb LEFT JOIN materials m ON mb.material_id = m.id WHERE mb.id = ?`
		type row struct {
			models.MaterialBatch
			MaterialCode  string `db:"material_code"`
			MaterialName  string `db:"material_name"`
			MaterialType  int    `db:"material_type"`
			Specification string `db:"specification"`
			Supplier      string `db:"supplier"`
		}
		var r row
		if err := database.DB.Get(&r, sql, batchID); err != nil {
			log.Printf("[ERROR] get material batch by id: %v", err)
			return utils.Fail(c, 404, "物料批次不存在")
		}
		r.MaterialBatch.MaterialCode = r.MaterialCode
		r.MaterialBatch.MaterialName = r.MaterialName
		r.MaterialBatch.MaterialType = r.MaterialType
		r.MaterialBatch.Specification = r.Specification
		r.MaterialBatch.Supplier = r.Supplier
		matBatch = r.MaterialBatch
		batchNo = matBatch.BatchNo
	} else {
		sql := `SELECT mb.id, mb.material_id, mb.batch_no, mb.quantity, mb.incoming_date, mb.supplier_batch,
			mb.status, mb.warehouse, mb.inspector, mb.remark, mb.created_at, mb.updated_at,
			m.material_code, m.material_name, m.material_type, m.specification, m.supplier
			FROM material_batches mb LEFT JOIN materials m ON mb.material_id = m.id WHERE mb.batch_no = ?`
		type row struct {
			models.MaterialBatch
			MaterialCode  string `db:"material_code"`
			MaterialName  string `db:"material_name"`
			MaterialType  int    `db:"material_type"`
			Specification string `db:"specification"`
			Supplier      string `db:"supplier"`
		}
		var r row
		if err := database.DB.Get(&r, sql, batchNo); err != nil {
			log.Printf("[ERROR] get material batch by no: %v", err)
			return utils.Fail(c, 404, "物料批次不存在")
		}
		r.MaterialBatch.MaterialCode = r.MaterialCode
		r.MaterialBatch.MaterialName = r.MaterialName
		r.MaterialBatch.MaterialType = r.MaterialType
		r.MaterialBatch.Specification = r.Specification
		r.MaterialBatch.Supplier = r.Supplier
		matBatch = r.MaterialBatch
		batchID = matBatch.ID
	}

	cacheKey := backwardPrefix + batchNo
	recordHotAccess(batchNo)
	fromCache := false

	if database.Redis != nil && isHotBatch(batchNo) {
		cached, err := database.Redis.Get(ctxBG, cacheKey).Result()
		if err == nil && cached != "" {
			var result models.TraceBackwardResult
			if jerr := json.Unmarshal([]byte(cached), &result); jerr == nil {
				result.FromCache = true
				log.Printf("[DEBUG] Backward trace cache HIT: %s", batchNo)
				return utils.OK(c, result)
			}
		}
		log.Printf("[DEBUG] Backward trace cache MISS, loading from DB: %s", batchNo)
	}

	result := models.TraceBackwardResult{
		MaterialBatch: matBatch,
		FromCache:     false,
	}

	type linkRow struct {
		models.BatchMaterialLink
		ProdBatchNo   string `db:"prod_batch_no"`
		ProductCode   string `db:"product_code"`
		ProductName   string `db:"product_name"`
	}
	linkRows := []linkRow{}
	linkSQL := `SELECT bml.id, bml.prod_batch_id, bml.material_batch_id, bml.used_qty, bml.issue_time,
		IFNULL(bml.issuer,'') AS issuer, IFNULL(bml.receiver,'') AS receiver, IFNULL(bml.remark,'') AS remark,
		pb.batch_no AS prod_batch_no, pr.product_code, pr.product_name
		FROM batch_material_links bml
		LEFT JOIN production_batches pb ON bml.prod_batch_id = pb.id
		LEFT JOIN products pr ON pb.product_id = pr.id
		WHERE bml.material_batch_id = ? ORDER BY bml.id`
	if err := database.DB.Select(&linkRows, linkSQL, batchID); err != nil {
		log.Printf("[ERROR] trace backward - links: %v", err)
	} else {
		for _, r := range linkRows {
			r.BatchMaterialLink.ProdBatchNo = r.ProdBatchNo
			r.BatchMaterialLink.MaterialBatchNo = matBatch.BatchNo
			r.BatchMaterialLink.MaterialCode = matBatch.MaterialCode
			r.BatchMaterialLink.MaterialName = fmt.Sprintf("%s / %s / %s", r.ProductCode, r.ProductName, r.ProdBatchNo)
			result.ProdBatches = append(result.ProdBatches, r.BatchMaterialLink)
		}
	}

	inspectSQL := `SELECT id, inspection_no, inspection_type, target_batch_id, target_batch_no,
		standard_id, inspect_qty, qualified_qty, defect_qty, result, inspector, inspect_time, remark
		FROM inspection_records WHERE inspection_type = 1 AND target_batch_id = ? ORDER BY id`
	if err := database.DB.Select(&result.Inspections, inspectSQL, batchID); err != nil {
		log.Printf("[ERROR] trace backward - inspections: %v", err)
	}

	defectSQL := `SELECT id, defect_no, defect_type, target_batch_id, target_batch_no,
		defect_code, defect_name, defect_desc, severity, defect_qty, reporter,
		report_time, process_status, responsible, remark
		FROM defect_records WHERE defect_type = 1 AND target_batch_id = ? ORDER BY id`
	if err := database.DB.Select(&result.Defects, defectSQL, batchID); err != nil {
		log.Printf("[ERROR] trace backward - defects: %v", err)
	}

	if database.Redis != nil && isHotBatch(batchNo) {
		cacheTTL := time.Duration(config.AppConfig.Redis.CacheTTL) * time.Second
		resultBytes, err := json.Marshal(result)
		if err == nil {
			setErr := database.Redis.Set(ctxBG, cacheKey, resultBytes, cacheTTL).Err()
			if setErr != nil {
				log.Printf("[DEBUG] Redis set cache skipped (not available): %v", setErr)
			} else {
				log.Printf("[DEBUG] Backward trace cached: %s (TTL=%s)", batchNo, cacheTTL)
			}
		}
	}

	log.Printf("[DEBUG] Backward trace complete: %s, prodBatches=%d, inspections=%d, defects=%d, cache=%t",
		batchNo, len(result.ProdBatches), len(result.Inspections), len(result.Defects), fromCache)
	result.FromCache = fromCache
	return utils.OK(c, result)
}

func ClearTraceCache(c echo.Context) error {
	if database.Redis == nil {
		return utils.Fail(c, 503, "Redis服务未连接")
	}
	iter := database.Redis.Scan(ctxBG, 0, "trace:*", 0).Iterator()
	count := 0
	for iter.Next(ctxBG) {
		database.Redis.Del(ctxBG, iter.Val())
		count++
	}
	if err := iter.Err(); err != nil {
		log.Printf("[ERROR] clear trace cache scan: %v", err)
		return utils.Fail(c, 500, "清除缓存失败")
	}
	log.Printf("[DEBUG] Cleared trace cache keys: %d", count)
	return utils.OK(c, map[string]interface{}{
		"cleared": count,
		"message": fmt.Sprintf("已清除 %d 条追溯缓存", count),
	})
}

func GetDashboardStats(c echo.Context) error {
	type statItem struct {
		Label string      `json:"label"`
		Value interface{} `json:"value"`
		Tip   string      `json:"tip,omitempty"`
	}

	cards := []statItem{}

	var total int64
	database.DB.Get(&total, "SELECT COUNT(*) FROM production_batches")
	cards = append(cards, statItem{Label: "生产批次总数", Value: total, Tip: "系统内所有生产批次"})

	database.DB.Get(&total, "SELECT COUNT(*) FROM material_batches WHERE status = 2")
	cards = append(cards, statItem{Label: "合格物料批次", Value: total, Tip: "来料检验合格的物料批次"})

	database.DB.Get(&total, "SELECT COUNT(*) FROM inspection_records WHERE result = 2")
	cards = append(cards, statItem{Label: "不合格检验单", Value: total, Tip: "判定为不合格的检验记录"})

	database.DB.Get(&total, "SELECT COUNT(*) FROM defect_records WHERE process_status IN (1,2)")
	cards = append(cards, statItem{Label: "待处理不良", Value: total, Tip: "未关闭的不良品记录"})

	var passRate float64
	row := database.DB.QueryRow(`SELECT IF(COUNT(*)=0,0,ROUND(SUM(CASE WHEN result=1 THEN 1 ELSE 0 END)*100/COUNT(*),2))
		FROM inspection_records WHERE result != 0`)
	row.Scan(&passRate)
	cards = append(cards, statItem{Label: "检验合格率", Value: fmt.Sprintf("%.2f%%", passRate), Tip: "综合检验一次合格率"})

	trend := []map[string]interface{}{}
	trendRows, _ := database.DB.Query(`SELECT DATE_FORMAT(inspect_time,'%m-%d') AS d,
		COUNT(*) AS total,
		SUM(CASE WHEN result=1 THEN 1 ELSE 0 END) AS pass
		FROM inspection_records
		WHERE inspect_time >= DATE_SUB(CURDATE(),INTERVAL 7 DAY)
		GROUP BY DATE(inspect_time) ORDER BY DATE(inspect_time)`)
	if trendRows != nil {
		defer trendRows.Close()
		for trendRows.Next() {
			var d string
			var total, pass int64
			trendRows.Scan(&d, &total, &pass)
			rate := 0.0
			if total > 0 {
				rate = float64(pass) * 100 / float64(total)
			}
			trend = append(trend, map[string]interface{}{
				"date":   d,
				"total":  total,
				"pass":   pass,
				"rate":   fmt.Sprintf("%.1f", rate),
			})
		}
	}

	return utils.OK(c, map[string]interface{}{
		"cards": cards,
		"trend": trend,
		"traceResult": utils.ToJSON(map[string]string{
			"forward_example":  "GET /api/trace/forward?batchNo=PB-20260618-001",
			"backward_example": "GET /api/trace/backward?batchNo=MB-20260616-003",
		}),
	})
}
