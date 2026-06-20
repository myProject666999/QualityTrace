package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"qualitytrace/database"
	"qualitytrace/models"
	"qualitytrace/utils"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

func GetInspectionStandards(c echo.Context) error {
	inspectionType, _ := strconv.Atoi(c.QueryParam("inspectionType"))
	targetType, _ := strconv.Atoi(c.QueryParam("targetType"))

	where := "WHERE status = 1"
	args := []interface{}{}
	if inspectionType > 0 {
		where += " AND inspection_type = ?"
		args = append(args, inspectionType)
	}
	if targetType > 0 {
		where += " AND target_type = ?"
		args = append(args, targetType)
	}

	list := []models.InspectionStandard{}
	sql := `SELECT id, std_code, std_name, target_type, target_id, inspection_type, inspection_mode,
		IFNULL(sampling_ratio,0) AS sampling_ratio, items, status,
		IFNULL(version,'') AS version, IFNULL(effective_date,'') AS effective_date,
		IFNULL(created_by,'') AS created_by,
		IFNULL(description,'') AS description, created_at, updated_at
		FROM inspection_standards ` + where + ` ORDER BY id DESC`
	if err := database.DB.Select(&list, sql, args...); err != nil {
		log.Printf("[ERROR] query inspection standards: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, list)
}

func GetInspectionRecords(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	inspectionType, _ := strconv.Atoi(c.QueryParam("inspectionType"))
	resultFilter, _ := strconv.Atoi(c.QueryParam("result"))
	keyword := strings.TrimSpace(c.QueryParam("keyword"))

	where := "WHERE 1=1"
	args := []interface{}{}
	if inspectionType > 0 {
		where += " AND ir.inspection_type = ?"
		args = append(args, inspectionType)
	}
	if resultFilter > 0 {
		where += " AND ir.result = ?"
		args = append(args, resultFilter)
	}
	if keyword != "" {
		where += " AND (ir.inspection_no LIKE ? OR ir.target_batch_no LIKE ? OR ir.inspector LIKE ?)"
		kw := "%" + keyword + "%"
		args = append(args, kw, kw, kw)
	}

	countSQL := `SELECT COUNT(*) FROM inspection_records ir ` + where
	var total int64
	if err := database.DB.Get(&total, countSQL, args...); err != nil {
		log.Printf("[ERROR] count inspection records: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	type row struct {
		models.InspectionRecord
		StdName string `db:"std_name"`
	}
	querySQL := `SELECT ir.id, ir.inspection_no, ir.inspection_type, ir.target_batch_id, IFNULL(ir.target_batch_no,'') AS target_batch_no,
		ir.standard_id, ir.inspect_qty, ir.qualified_qty, ir.defect_qty, ir.result, IFNULL(ir.inspector,'') AS inspector,
		ir.inspect_time, IFNULL(ir.remark,'') AS remark, ir.created_at, ir.updated_at,
		IFNULL(iss.std_name,'') AS std_name
		FROM inspection_records ir
		LEFT JOIN inspection_standards iss ON ir.standard_id = iss.id ` + where + `
		ORDER BY ir.id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, (page-1)*pageSize)

	rows := []row{}
	if err := database.DB.Select(&rows, querySQL, args...); err != nil {
		log.Printf("[ERROR] query inspection records: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	result := make([]models.InspectionRecord, 0, len(rows))
	for _, r := range rows {
		r.InspectionRecord.StdName = r.StdName
		result = append(result, r.InspectionRecord)
	}
	return utils.OK(c, utils.PageResult(result, total, page, pageSize))
}

func GetInspectionRecordDetail(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if id == 0 {
		return utils.Fail(c, 400, "ID不能为空")
	}

	var rec models.InspectionRecord
	sql := `SELECT id, inspection_no, inspection_type, target_batch_id, IFNULL(target_batch_no,'') AS target_batch_no,
		standard_id, inspect_qty, qualified_qty, defect_qty, result, IFNULL(inspector,'') AS inspector,
		inspect_time, IFNULL(remark,'') AS remark, created_at, updated_at
		FROM inspection_records WHERE id = ?`
	if err := database.DB.Get(&rec, sql, id); err != nil {
		log.Printf("[ERROR] get inspection record: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	items := []models.InspectionItem{}
	if err := database.DB.Select(&items,
		`SELECT id, record_id, item_name, standard_value, actual_value, unit, result, method, IFNULL(memo,'') AS memo, created_at
		FROM inspection_items WHERE record_id = ? ORDER BY id`, id); err != nil {
		log.Printf("[ERROR] get inspection items: %v", err)
	}
	rec.Items = items
	return utils.OK(c, rec)
}

func CreateInspectionRecord(c echo.Context) error {
	var req struct {
		InspectionType int                      `json:"inspectionType"`
		TargetBatchID  uint64                   `json:"targetBatchId"`
		TargetBatchNo  string                   `json:"targetBatchNo"`
		StandardID     *uint64                  `json:"standardId"`
		InspectQty     float64                  `json:"inspectQty"`
		QualifiedQty   float64                  `json:"qualifiedQty"`
		DefectQty      float64                  `json:"defectQty"`
		Result         int                      `json:"result"`
		Inspector      string                   `json:"inspector"`
		Remark         string                   `json:"remark"`
		Items          []models.InspectionItem `json:"items"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, 400, "参数错误: "+err.Error())
	}
	if req.InspectionType == 0 || req.TargetBatchID == 0 || req.TargetBatchNo == "" || req.Inspector == "" {
		return utils.Fail(c, 400, "必填项不能为空")
	}

	now := time.Now()
	inspectionNo := fmt.Sprintf("%s-%d", getInspectionTypePrefix(req.InspectionType), now.Unix())

	tx, err := database.DB.Beginx()
	if err != nil {
		log.Printf("[ERROR] begin tx: %v", err)
		return utils.Fail(c, 500, "事务开始失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	res, err := tx.Exec(`INSERT INTO inspection_records
		(inspection_no, inspection_type, target_batch_id, target_batch_no, standard_id, inspect_qty, qualified_qty, defect_qty, result, inspector, inspect_time, remark)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		inspectionNo, req.InspectionType, req.TargetBatchID, req.TargetBatchNo, req.StandardID,
		req.InspectQty, req.QualifiedQty, req.DefectQty, req.Result, req.Inspector, now, req.Remark)
	if err != nil {
		tx.Rollback()
		log.Printf("[ERROR] insert inspection record: %v", err)
		return utils.Fail(c, 500, "创建检验记录失败")
	}
	recordID, _ := res.LastInsertId()

	for _, item := range req.Items {
		_, err := tx.Exec(`INSERT INTO inspection_items
			(record_id, item_name, standard_value, actual_value, unit, result, method, memo)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			recordID, item.ItemName, item.StandardValue, item.ActualValue, item.Unit, item.Result, item.Method, item.Memo)
		if err != nil {
			tx.Rollback()
			log.Printf("[ERROR] insert inspection item: %v", err)
			return utils.Fail(c, 500, "创建检验项失败")
		}
	}

	// 如果是来料检验，更新物料批次状态
	if req.InspectionType == 1 {
		batchStatus := 0
		switch req.Result {
		case 1:
			batchStatus = 2
		case 2:
			batchStatus = 3
		case 3:
			batchStatus = 4
		}
		if batchStatus > 0 {
			if _, err := tx.Exec(`UPDATE material_batches SET status = ?, inspector = ? WHERE id = ?`,
				batchStatus, req.Inspector, req.TargetBatchID); err != nil {
				tx.Rollback()
				log.Printf("[ERROR] update material batch status: %v", err)
				return utils.Fail(c, 500, "更新批次状态失败")
			}
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[ERROR] commit tx: %v", err)
		return utils.Fail(c, 500, "提交失败")
	}

	log.Printf("[DEBUG] Created inspection: %s, type=%d, target=%s, result=%d", inspectionNo, req.InspectionType, req.TargetBatchNo, req.Result)
	return utils.OK(c, map[string]interface{}{
		"id":           recordID,
		"inspectionNo": inspectionNo,
	})
}

func getInspectionTypePrefix(t int) string {
	switch t {
	case 1:
		return "IQC"
	case 2:
		return "IPQC"
	case 3:
		return "FQC"
	default:
		return "QC"
	}
}

func GetInspectionStats(c echo.Context) error {
	type stats struct {
		Label string `json:"label"`
		Value int64  `json:"value"`
	}

	// 按检验类型统计
	byType := []stats{}
	sql := `SELECT inspection_type, COUNT(*) FROM inspection_records GROUP BY inspection_type`
	rows, err := database.DB.Query(sql)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t, v int
			rows.Scan(&t, &v)
			labels := map[int]string{1: "来料检验", 2: "过程检验", 3: "成品检验"}
			byType = append(byType, stats{Label: labels[t], Value: int64(v)})
		}
	}

	// 按结果统计
	byResult := []stats{}
	sql = `SELECT result, COUNT(*) FROM inspection_records GROUP BY result`
	rows, err = database.DB.Query(sql)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r, v int
			rows.Scan(&r, &v)
			labels := map[int]string{0: "未判定", 1: "合格", 2: "不合格", 3: "让步接收"}
			byResult = append(byResult, stats{Label: labels[r], Value: int64(v)})
		}
	}

	return utils.OK(c, map[string]interface{}{
		"byType":   byType,
		"byResult": byResult,
		"raw":      json.RawMessage("{}"),
	})
}
