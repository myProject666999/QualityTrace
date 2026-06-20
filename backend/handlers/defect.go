package handlers

import (
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

func GetDefectRecords(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	defectType, _ := strconv.Atoi(c.QueryParam("defectType"))
	severity, _ := strconv.Atoi(c.QueryParam("severity"))
	processStatus, _ := strconv.Atoi(c.QueryParam("processStatus"))
	keyword := strings.TrimSpace(c.QueryParam("keyword"))

	where := "WHERE 1=1"
	args := []interface{}{}
	if defectType > 0 {
		where += " AND defect_type = ?"
		args = append(args, defectType)
	}
	if severity > 0 {
		where += " AND severity = ?"
		args = append(args, severity)
	}
	if processStatus > 0 {
		where += " AND process_status = ?"
		args = append(args, processStatus)
	}
	if keyword != "" {
		where += " AND (defect_no LIKE ? OR target_batch_no LIKE ? OR defect_name LIKE ? OR reporter LIKE ?)"
		kw := "%" + keyword + "%"
		args = append(args, kw, kw, kw, kw)
	}

	countSQL := "SELECT COUNT(*) FROM defect_records " + where
	var total int64
	if err := database.DB.Get(&total, countSQL, args...); err != nil {
		log.Printf("[ERROR] count defect records: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	querySQL := `SELECT id, defect_no, defect_type, target_batch_id, IFNULL(target_batch_no,'') AS target_batch_no, inspection_id,
		IFNULL(defect_code,'') AS defect_code, IFNULL(defect_name,'') AS defect_name, IFNULL(defect_desc,'') AS defect_desc, severity, defect_qty, IFNULL(reporter,'') AS reporter, report_time,
		process_status, IFNULL(responsible,'') AS responsible, IFNULL(remark,'') AS remark, created_at, updated_at
		FROM defect_records ` + where + ` ORDER BY id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, (page-1)*pageSize)

	list := []models.DefectRecord{}
	if err := database.DB.Select(&list, querySQL, args...); err != nil {
		log.Printf("[ERROR] query defect records: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, utils.PageResult(list, total, page, pageSize))
}

func GetDefectRecordDetail(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if id == 0 {
		return utils.Fail(c, 400, "ID不能为空")
	}

	var rec models.DefectRecord
	sql := `SELECT id, defect_no, defect_type, target_batch_id, IFNULL(target_batch_no,'') AS target_batch_no, inspection_id,
		IFNULL(defect_code,'') AS defect_code, IFNULL(defect_name,'') AS defect_name, IFNULL(defect_desc,'') AS defect_desc, severity, defect_qty, IFNULL(reporter,'') AS reporter, report_time,
		process_status, IFNULL(responsible,'') AS responsible, IFNULL(remark,'') AS remark, created_at, updated_at
		FROM defect_records WHERE id = ?`
	if err := database.DB.Get(&rec, sql, id); err != nil {
		log.Printf("[ERROR] get defect record: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	disps := []models.DefectDisposition{}
	sql2 := `SELECT id, defect_id, disposition_type, disposition_qty, IFNULL(handler,'') AS handler, handle_time,
		IFNULL(approver,'') AS approver, approve_time, approve_status, IFNULL(reason,'') AS reason, IFNULL(rework_batch_no,'') AS rework_batch_no, cost, IFNULL(result,'') AS result,
		created_at, updated_at FROM defect_dispositions WHERE defect_id = ? ORDER BY id`
	if err := database.DB.Select(&disps, sql2, id); err != nil {
		log.Printf("[ERROR] get defect dispositions: %v", err)
	}
	rec.Dispositions = disps
	return utils.OK(c, rec)
}

func CreateDefectRecord(c echo.Context) error {
	var req struct {
		DefectType    int     `json:"defectType"`
		TargetBatchID uint64  `json:"targetBatchId"`
		TargetBatchNo string  `json:"targetBatchNo"`
		InspectionID  *uint64 `json:"inspectionId"`
		DefectCode    string  `json:"defectCode"`
		DefectName    string  `json:"defectName"`
		DefectDesc    string  `json:"defectDesc"`
		Severity      int     `json:"severity"`
		DefectQty     float64 `json:"defectQty"`
		Reporter      string  `json:"reporter"`
		Responsible   string  `json:"responsible"`
		Remark        string  `json:"remark"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, 400, "参数错误: "+err.Error())
	}
	if req.DefectType == 0 || req.TargetBatchID == 0 || req.TargetBatchNo == "" ||
		req.DefectName == "" || req.Reporter == "" {
		return utils.Fail(c, 400, "必填项不能为空")
	}
	if req.Severity == 0 {
		req.Severity = 2
	}

	now := time.Now()
	defectNo := fmt.Sprintf("D-%s-%03d", now.Format("20060102"), time.Now().Unix()%1000)

	res, err := database.DB.Exec(`INSERT INTO defect_records
		(defect_no, defect_type, target_batch_id, target_batch_no, inspection_id,
		 defect_code, defect_name, defect_desc, severity, defect_qty, reporter,
		 report_time, process_status, responsible, remark)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
		defectNo, req.DefectType, req.TargetBatchID, req.TargetBatchNo, req.InspectionID,
		req.DefectCode, req.DefectName, req.DefectDesc, req.Severity, req.DefectQty, req.Reporter,
		now, req.Responsible, req.Remark)
	if err != nil {
		log.Printf("[ERROR] create defect record: %v", err)
		return utils.Fail(c, 500, "创建失败")
	}
	id, _ := res.LastInsertId()

	log.Printf("[DEBUG] Created defect: %s, type=%d, batch=%s, severity=%d", defectNo, req.DefectType, req.TargetBatchNo, req.Severity)
	return utils.OK(c, map[string]interface{}{"id": id, "defectNo": defectNo})
}

func CreateDefectDisposition(c echo.Context) error {
	var req struct {
		DefectID         uint64   `json:"defectId"`
		DispositionType  int      `json:"dispositionType"`
		DispositionQty   float64  `json:"dispositionQty"`
		Handler          string   `json:"handler"`
		Approver         string   `json:"approver"`
		ApproveStatus    int      `json:"approveStatus"`
		Reason           string   `json:"reason"`
		ReworkBatchNo    string   `json:"reworkBatchNo"`
		Cost             *float64 `json:"cost"`
		Result           string   `json:"result"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, 400, "参数错误: "+err.Error())
	}
	if req.DefectID == 0 || req.DispositionType == 0 || req.Handler == "" {
		return utils.Fail(c, 400, "必填项不能为空")
	}

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

	now := time.Now()
	var approveTime *time.Time
	if req.ApproveStatus == 1 {
		approveTime = &now
	}

	_, err = tx.Exec(`INSERT INTO defect_dispositions
		(defect_id, disposition_type, disposition_qty, handler, handle_time,
		 approver, approve_time, approve_status, reason, rework_batch_no, cost, result)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.DefectID, req.DispositionType, req.DispositionQty, req.Handler, now,
		req.Approver, approveTime, req.ApproveStatus, req.Reason, req.ReworkBatchNo, req.Cost, req.Result)
	if err != nil {
		tx.Rollback()
		log.Printf("[ERROR] insert disposition: %v", err)
		return utils.Fail(c, 500, "创建处置记录失败")
	}

	// 更新不良处理状态
	newStatus := 2
	if req.ApproveStatus == 1 {
		// 如果是报废或让步接收，直接关闭
		if req.DispositionType == 3 || req.DispositionType == 4 || req.DispositionType == 5 {
			newStatus = 4
		} else {
			newStatus = 3
		}
	}
	if req.Result != "" && req.DispositionType == 1 {
		newStatus = 4
	}

	if _, err := tx.Exec(`UPDATE defect_records SET process_status = ?, updated_at = ? WHERE id = ?`,
		newStatus, now, req.DefectID); err != nil {
		tx.Rollback()
		log.Printf("[ERROR] update defect status: %v", err)
		return utils.Fail(c, 500, "更新不良状态失败")
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[ERROR] commit tx: %v", err)
		return utils.Fail(c, 500, "提交失败")
	}

	typeMap := map[int]string{1: "返工", 2: "返修", 3: "报废", 4: "让步接收", 5: "退换货"}
	log.Printf("[DEBUG] Defect #%d disposition: %s, qty=%.0f, status=%d",
		req.DefectID, typeMap[req.DispositionType], req.DispositionQty, newStatus)
	return utils.OK(c, map[string]interface{}{"success": true})
}

func ApproveDefectDisposition(c echo.Context) error {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if id == 0 {
		return utils.Fail(c, 400, "ID不能为空")
	}

	var req struct {
		Approver      string `json:"approver"`
		ApproveStatus int    `json:"approveStatus"`
		ApproveRemark string `json:"approveRemark"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, 400, "参数错误")
	}
	if req.Approver == "" {
		return utils.Fail(c, 400, "审批人不能为空")
	}

	now := time.Now()
	_, err := database.DB.Exec(`UPDATE defect_dispositions
		SET approver = ?, approve_time = ?, approve_status = ?, result = CONCAT(IFNULL(result,''), IF(?<>'', CONCAT('[审批意见]',?), ''))
		WHERE id = ?`,
		req.Approver, now, req.ApproveStatus, req.ApproveRemark, req.ApproveRemark, id)
	if err != nil {
		log.Printf("[ERROR] approve disposition: %v", err)
		return utils.Fail(c, 500, "审批失败")
	}

	// 同步更新不良状态
	if req.ApproveStatus == 1 {
		_, err = database.DB.Exec(`UPDATE defect_records dr
			INNER JOIN defect_dispositions dd ON dr.id = dd.defect_id
			SET dr.process_status = CASE dd.disposition_type
				WHEN 3 THEN 4 WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 3 END
			WHERE dd.id = ?`, id)
		if err != nil {
			log.Printf("[WARN] update defect status after approve: %v", err)
		}
	}

	return utils.OK(c, map[string]interface{}{"success": true})
}

func GetDefectStats(c echo.Context) error {
	type stats struct {
		Label string `json:"label"`
		Value int64  `json:"value"`
	}

	bySeverity := []stats{}
	rows, _ := database.DB.Query(`SELECT severity, COUNT(*) FROM defect_records GROUP BY severity`)
	if rows != nil {
		defer rows.Close()
		labels := map[int]string{1: "轻微", 2: "一般", 3: "严重", 4: "致命"}
		for rows.Next() {
			var s, v int
			rows.Scan(&s, &v)
			bySeverity = append(bySeverity, stats{Label: labels[s], Value: int64(v)})
		}
	}

	byType := []stats{}
	rows, _ = database.DB.Query(`SELECT disposition_type, COUNT(*) FROM defect_dispositions GROUP BY disposition_type`)
	if rows != nil {
		defer rows.Close()
		labels := map[int]string{1: "返工", 2: "返修", 3: "报废", 4: "让步接收", 5: "退换货"}
		for rows.Next() {
			var t, v int
			rows.Scan(&t, &v)
			byType = append(byType, stats{Label: labels[t], Value: int64(v)})
		}
	}

	byStatus := []stats{}
	rows, _ = database.DB.Query(`SELECT process_status, COUNT(*) FROM defect_records GROUP BY process_status`)
	if rows != nil {
		defer rows.Close()
		labels := map[int]string{1: "待处理", 2: "处理中", 3: "已处理", 4: "已关闭"}
		for rows.Next() {
			var s, v int
			rows.Scan(&s, &v)
			byStatus = append(byStatus, stats{Label: labels[s], Value: int64(v)})
		}
	}

	return utils.OK(c, map[string]interface{}{
		"bySeverity":    bySeverity,
		"byDisposition": byType,
		"byStatus":      byStatus,
	})
}
