package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"qualitytrace/database"
	"qualitytrace/models"
	"qualitytrace/utils"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
)

func GetMaterialList(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	keyword := strings.TrimSpace(c.QueryParam("keyword"))
	materialType, _ := strconv.Atoi(c.QueryParam("materialType"))

	where := "WHERE 1=1"
	args := []interface{}{}
	idx := 1
	if keyword != "" {
		where += " AND (material_code LIKE ? OR material_name LIKE ? OR supplier LIKE ?)"
		kw := "%" + keyword + "%"
		args = append(args, kw, kw, kw)
		idx += 3
	}
	if materialType > 0 {
		where += " AND material_type = ?"
		args = append(args, materialType)
	}

	countSQL := "SELECT COUNT(*) FROM materials " + where
	var total int64
	if err := database.DB.Get(&total, countSQL, args...); err != nil {
		log.Printf("[ERROR] count materials: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	querySQL := `SELECT id, material_code, material_name, material_type,
		IFNULL(specification,'') AS specification, unit,
		IFNULL(supplier,'') AS supplier,
		IFNULL(description,'') AS description, created_at, updated_at
		FROM materials ` + where + ` ORDER BY id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, (page-1)*pageSize)

	list := []models.Material{}
	if err := database.DB.Select(&list, querySQL, args...); err != nil {
		log.Printf("[ERROR] query materials: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, utils.PageResult(list, total, page, pageSize))
}

func GetMaterialBatchList(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	keyword := strings.TrimSpace(c.QueryParam("keyword"))
	status, _ := strconv.Atoi(c.QueryParam("status"))

	where := "WHERE 1=1"
	args := []interface{}{}
	if keyword != "" {
		where += " AND (mb.batch_no LIKE ? OR m.material_code LIKE ? OR m.material_name LIKE ?)"
		kw := "%" + keyword + "%"
		args = append(args, kw, kw, kw)
	}
	if status > 0 {
		where += " AND mb.status = ?"
		args = append(args, status)
	}

	countSQL := `SELECT COUNT(*) FROM material_batches mb LEFT JOIN materials m ON mb.material_id = m.id ` + where
	var total int64
	if err := database.DB.Get(&total, countSQL, args...); err != nil {
		log.Printf("[ERROR] count material batches: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	querySQL := `SELECT mb.id, mb.material_id, mb.batch_no, mb.quantity, mb.incoming_date,
		IFNULL(mb.supplier_batch,'') AS supplier_batch, mb.status,
		IFNULL(mb.warehouse,'') AS warehouse,
		IFNULL(mb.inspector,'') AS inspector,
		IFNULL(mb.remark,'') AS remark, mb.created_at, mb.updated_at,
		IFNULL(m.material_code,'') AS material_code,
		IFNULL(m.material_name,'') AS material_name,
		IFNULL(m.material_type,0) AS material_type,
		IFNULL(m.specification,'') AS specification,
		IFNULL(m.supplier,'') AS supplier
		FROM material_batches mb LEFT JOIN materials m ON mb.material_id = m.id ` + where + `
		ORDER BY mb.id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, (page-1)*pageSize)

	list := []models.MaterialBatch{}
	if err := database.DB.Select(&list, querySQL, args...); err != nil {
		log.Printf("[ERROR] query material batches: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, utils.PageResult(list, total, page, pageSize))
}

func GetProductList(c echo.Context) error {
	list := []models.Product{}
	if err := database.DB.Select(&list,
		`SELECT id, product_code, product_name,
		IFNULL(specification,'') AS specification, unit,
		IFNULL(description,'') AS description, created_at, updated_at
		FROM products ORDER BY id DESC`); err != nil {
		log.Printf("[ERROR] query products: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, list)
}

func GetProductionBatchList(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	keyword := strings.TrimSpace(c.QueryParam("keyword"))
	status, _ := strconv.Atoi(c.QueryParam("status"))

	where := "WHERE 1=1"
	args := []interface{}{}
	if keyword != "" {
		where += " AND (pb.batch_no LIKE ? OR pb.work_order LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ?)"
		kw := "%" + keyword + "%"
		args = append(args, kw, kw, kw, kw)
	}
	if status > 0 {
		where += " AND pb.status = ?"
		args = append(args, status)
	}

	countSQL := `SELECT COUNT(*) FROM production_batches pb LEFT JOIN products p ON pb.product_id = p.id ` + where
	var total int64
	if err := database.DB.Get(&total, countSQL, args...); err != nil {
		log.Printf("[ERROR] count production batches: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	querySQL := `SELECT pb.id, pb.product_id, pb.batch_no,
		IFNULL(pb.work_order,'') AS work_order, pb.planned_qty, pb.actual_qty, pb.production_date,
		IFNULL(pb.production_line,'') AS production_line, pb.status,
		IFNULL(pb.created_by,'') AS created_by,
		IFNULL(pb.remark,'') AS remark, pb.created_at, pb.updated_at,
		IFNULL(p.product_code,'') AS product_code,
		IFNULL(p.product_name,'') AS product_name
		FROM production_batches pb LEFT JOIN products p ON pb.product_id = p.id ` + where + `
		ORDER BY pb.id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, (page-1)*pageSize)

	list := []models.ProductionBatch{}
	if err := database.DB.Select(&list, querySQL, args...); err != nil {
		log.Printf("[ERROR] query production batches: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, utils.PageResult(list, total, page, pageSize))
}

func GetEquipmentList(c echo.Context) error {
	list := []models.Equipment{}
	if err := database.DB.Select(&list,
		`SELECT id, equip_code, equip_name,
		IFNULL(equip_type,'') AS equip_type,
		IFNULL(location,'') AS location,
		IFNULL(manufacturer,'') AS manufacturer,
		IFNULL(purchase_date,'') AS purchase_date, status,
		IFNULL(description,'') AS description, created_at, updated_at
		FROM equipment ORDER BY id DESC`); err != nil {
		log.Printf("[ERROR] query equipment: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, list)
}

func GetWorkShiftList(c echo.Context) error {
	list := []models.WorkShift{}
	if err := database.DB.Select(&list, "SELECT id, shift_code, shift_name, shift_type, leader, members, status, remark, created_at, updated_at FROM work_shifts ORDER BY id"); err != nil {
		log.Printf("[ERROR] query work shifts: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}
	return utils.OK(c, list)
}

func GetProductionLogs(c echo.Context) error {
	batchID, _ := strconv.ParseUint(c.QueryParam("prodBatchId"), 10, 64)
	if batchID == 0 {
		return utils.Fail(c, 400, "批次ID不能为空")
	}

	type row struct {
		models.ProductionLog
		EquipCode sql.NullString `db:"equip_code"`
		EquipName sql.NullString `db:"equip_name"`
		ShiftName sql.NullString `db:"shift_name"`
		ShiftType sql.NullInt64  `db:"shift_type"`
	}
	rows := []row{}
	sql := `SELECT pl.id, pl.prod_batch_id, pl.equipment_id, pl.shift_id, pl.process_step, pl.start_time, pl.end_time,
		IFNULL(pl.operator,'') AS operator, pl.output_qty, pl.defect_qty,
		IFNULL(pl.remark,'') AS remark, pl.created_at, pl.updated_at,
		e.equip_code, e.equip_name, ws.shift_name, ws.shift_type
		FROM production_logs pl
		LEFT JOIN equipment e ON pl.equipment_id = e.id
		LEFT JOIN work_shifts ws ON pl.shift_id = ws.id
		WHERE pl.prod_batch_id = ? ORDER BY pl.start_time`
	if err := database.DB.Select(&rows, sql, batchID); err != nil {
		log.Printf("[ERROR] query production logs: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	result := make([]models.ProductionLog, 0, len(rows))
	for _, r := range rows {
		r.ProductionLog.EquipCode = r.EquipCode.String
		r.ProductionLog.EquipName = r.EquipName.String
		r.ProductionLog.ShiftName = r.ShiftName.String
		if r.ShiftType.Valid {
			r.ProductionLog.ShiftType = int(r.ShiftType.Int64)
		}
		result = append(result, r.ProductionLog)
	}
	return utils.OK(c, result)
}

func GetBatchMaterialLinks(c echo.Context) error {
	batchID, _ := strconv.ParseUint(c.QueryParam("prodBatchId"), 10, 64)
	if batchID == 0 {
		return utils.Fail(c, 400, "批次ID不能为空")
	}

	type row struct {
		models.BatchMaterialLink
		ProdBatchNo     sql.NullString `db:"prod_batch_no"`
		MaterialBatchNo sql.NullString `db:"material_batch_no"`
		MaterialName    sql.NullString `db:"material_name"`
		MaterialCode    sql.NullString `db:"material_code"`
	}
	rows := []row{}
	sql := `SELECT bml.id, bml.prod_batch_id, bml.material_batch_id, bml.used_qty, bml.issue_time,
		IFNULL(bml.issuer,'') AS issuer,
		IFNULL(bml.receiver,'') AS receiver,
		IFNULL(bml.remark,'') AS remark, bml.created_at,
		pb.batch_no AS prod_batch_no, mb.batch_no AS material_batch_no,
		m.material_name, m.material_code
		FROM batch_material_links bml
		LEFT JOIN production_batches pb ON bml.prod_batch_id = pb.id
		LEFT JOIN material_batches mb ON bml.material_batch_id = mb.id
		LEFT JOIN materials m ON mb.material_id = m.id
		WHERE bml.prod_batch_id = ? ORDER BY bml.id`
	if err := database.DB.Select(&rows, sql, batchID); err != nil {
		log.Printf("[ERROR] query batch material links: %v", err)
		return utils.Fail(c, 500, "查询失败")
	}

	result := make([]models.BatchMaterialLink, 0, len(rows))
	for _, r := range rows {
		r.BatchMaterialLink.ProdBatchNo = r.ProdBatchNo.String
		r.BatchMaterialLink.MaterialBatchNo = r.MaterialBatchNo.String
		r.BatchMaterialLink.MaterialName = r.MaterialName.String
		r.BatchMaterialLink.MaterialCode = r.MaterialCode.String
		result = append(result, r.BatchMaterialLink)
	}
	return utils.OK(c, result)
}

func CreateProductionBatch(c echo.Context) error {
	var req struct {
		ProductID      uint64  `json:"productId"`
		BatchNo        string  `json:"batchNo"`
		WorkOrder      string  `json:"workOrder"`
		PlannedQty     float64 `json:"plannedQty"`
		ActualQty      float64 `json:"actualQty"`
		ProductionDate string  `json:"productionDate"`
		ProductionLine string  `json:"productionLine"`
		CreatedBy      string  `json:"createdBy"`
		Remark         string  `json:"remark"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, 400, "参数错误: "+err.Error())
	}
	if req.ProductID == 0 || req.BatchNo == "" || req.ProductionDate == "" {
		return utils.Fail(c, 400, "产品、批次号、生产日期不能为空")
	}

	res, err := database.DB.Exec(`INSERT INTO production_batches
		(product_id, batch_no, work_order, planned_qty, actual_qty, production_date, production_line, status, created_by, remark)
		VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
		req.ProductID, req.BatchNo, req.WorkOrder, req.PlannedQty, req.ActualQty, req.ProductionDate, req.ProductionLine, req.CreatedBy, req.Remark)
	if err != nil {
		log.Printf("[ERROR] create production batch: %v", err)
		return utils.Fail(c, 500, "创建失败")
	}
	id, _ := res.LastInsertId()
	return utils.OK(c, map[string]interface{}{"id": id, "batchNo": req.BatchNo})
}

func CreateMaterialBatch(c echo.Context) error {
	var req struct {
		MaterialID    uint64  `json:"materialId"`
		BatchNo       string  `json:"batchNo"`
		Quantity      float64 `json:"quantity"`
		IncomingDate  string  `json:"incomingDate"`
		SupplierBatch string  `json:"supplierBatch"`
		Warehouse     string  `json:"warehouse"`
		Inspector     string  `json:"inspector"`
		Remark        string  `json:"remark"`
	}
	if err := c.Bind(&req); err != nil {
		return utils.Fail(c, http.StatusBadRequest, "参数错误")
	}
	if req.MaterialID == 0 || req.BatchNo == "" {
		return utils.Fail(c, http.StatusBadRequest, "物料和批次号不能为空")
	}

	res, err := database.DB.Exec(`INSERT INTO material_batches
		(material_id, batch_no, quantity, incoming_date, supplier_batch, status, warehouse, inspector, remark)
		VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
		req.MaterialID, req.BatchNo, req.Quantity, req.IncomingDate, req.SupplierBatch, req.Warehouse, req.Inspector, req.Remark)
	if err != nil {
		log.Printf("[ERROR] create material batch: %v", err)
		return utils.Fail(c, 500, "创建失败")
	}
	id, _ := res.LastInsertId()
	return utils.OK(c, map[string]interface{}{"id": id, "batchNo": req.BatchNo})
}
