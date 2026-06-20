package models

import (
	"encoding/json"
	"time"
)

type Material struct {
	ID            uint64    `json:"id" db:"id"`
	MaterialCode  string    `json:"materialCode" db:"material_code"`
	MaterialName  string    `json:"materialName" db:"material_name"`
	MaterialType  int       `json:"materialType" db:"material_type"`
	Specification string    `json:"specification" db:"specification"`
	Unit          string    `json:"unit" db:"unit"`
	Supplier      string    `json:"supplier" db:"supplier"`
	Description   string    `json:"description" db:"description"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}

type MaterialBatch struct {
	ID            uint64    `json:"id" db:"id"`
	MaterialID    uint64    `json:"materialId" db:"material_id"`
	BatchNo       string    `json:"batchNo" db:"batch_no"`
	Quantity      float64   `json:"quantity" db:"quantity"`
	IncomingDate  string    `json:"incomingDate" db:"incoming_date"`
	SupplierBatch string    `json:"supplierBatch" db:"supplier_batch"`
	Status        int       `json:"status" db:"status"`
	Warehouse     string    `json:"warehouse" db:"warehouse"`
	Inspector     string    `json:"inspector" db:"inspector"`
	Remark        string    `json:"remark" db:"remark"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
	MaterialCode  string `json:"materialCode,omitempty" db:"material_code"`
	MaterialName  string `json:"materialName,omitempty" db:"material_name"`
	MaterialType  int    `json:"materialTypeCode,omitempty" db:"material_type"`
	Specification string `json:"specificationName,omitempty" db:"specification"`
	Supplier      string `json:"supplierName,omitempty" db:"supplier"`
}

type Product struct {
	ID            uint64    `json:"id" db:"id"`
	ProductCode   string    `json:"productCode" db:"product_code"`
	ProductName   string    `json:"productName" db:"product_name"`
	Specification string    `json:"specification" db:"specification"`
	Unit          string    `json:"unit" db:"unit"`
	Description   string    `json:"description" db:"description"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}

type ProductionBatch struct {
	ID             uint64    `json:"id" db:"id"`
	ProductID      uint64    `json:"productId" db:"product_id"`
	BatchNo        string    `json:"batchNo" db:"batch_no"`
	WorkOrder      string    `json:"workOrder" db:"work_order"`
	PlannedQty     float64   `json:"plannedQty" db:"planned_qty"`
	ActualQty      float64   `json:"actualQty" db:"actual_qty"`
	ProductionDate string    `json:"productionDate" db:"production_date"`
	ProductionLine string    `json:"productionLine" db:"production_line"`
	Status         int       `json:"status" db:"status"`
	CreatedBy      string    `json:"createdBy" db:"created_by"`
	Remark         string    `json:"remark" db:"remark"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
	ProductCode    string `json:"productCode,omitempty" db:"product_code"`
	ProductName    string `json:"productName,omitempty" db:"product_name"`
}

type Equipment struct {
	ID           uint64    `json:"id" db:"id"`
	EquipCode    string    `json:"equipCode" db:"equip_code"`
	EquipName    string    `json:"equipName" db:"equip_name"`
	EquipType    string    `json:"equipType" db:"equip_type"`
	Location     string    `json:"location" db:"location"`
	Manufacturer string    `json:"manufacturer" db:"manufacturer"`
	PurchaseDate string    `json:"purchaseDate" db:"purchase_date"`
	Status       int       `json:"status" db:"status"`
	Description  string    `json:"description" db:"description"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

type WorkShift struct {
	ID        uint64    `json:"id" db:"id"`
	ShiftCode string    `json:"shiftCode" db:"shift_code"`
	ShiftName string    `json:"shiftName" db:"shift_name"`
	ShiftType int       `json:"shiftType" db:"shift_type"`
	Leader    string    `json:"leader,omitempty" db:"leader"`
	Members   string    `json:"members,omitempty" db:"members"`
	Status    int       `json:"status" db:"status"`
	Remark    string    `json:"remark,omitempty" db:"remark"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type ProductionLog struct {
	ID          uint64     `json:"id" db:"id"`
	ProdBatchID uint64     `json:"prodBatchId" db:"prod_batch_id"`
	EquipmentID uint64     `json:"equipmentId" db:"equipment_id"`
	ShiftID     uint64     `json:"shiftId" db:"shift_id"`
	ProcessStep string     `json:"processStep" db:"process_step"`
	StartTime   time.Time  `json:"startTime" db:"start_time"`
	EndTime     *time.Time `json:"endTime" db:"end_time"`
	Operator    string     `json:"operator,omitempty" db:"operator"`
	OutputQty   float64    `json:"outputQty" db:"output_qty"`
	DefectQty   float64    `json:"defectQty" db:"defect_qty"`
	Remark      string     `json:"remark,omitempty" db:"remark"`
	CreatedAt   time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time  `json:"updatedAt" db:"updated_at"`
	EquipCode   string     `json:"equipCode,omitempty" db:"equip_code"`
	EquipName   string     `json:"equipName,omitempty" db:"equip_name"`
	ShiftName   string     `json:"shiftName,omitempty" db:"shift_name"`
	ShiftType   int        `json:"shiftTypeCode,omitempty" db:"shift_type"`
}

type BatchMaterialLink struct {
	ID              uint64    `json:"id" db:"id"`
	ProdBatchID     uint64    `json:"prodBatchId" db:"prod_batch_id"`
	MaterialBatchID uint64    `json:"materialBatchId" db:"material_batch_id"`
	UsedQty         float64   `json:"usedQty" db:"used_qty"`
	IssueTime       time.Time `json:"issueTime" db:"issue_time"`
	Issuer          string    `json:"issuer,omitempty" db:"issuer"`
	Receiver        string    `json:"receiver,omitempty" db:"receiver"`
	Remark          string    `json:"remark,omitempty" db:"remark"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	ProdBatchNo     string    `json:"prodBatchNo,omitempty" db:"prod_batch_no"`
	MaterialBatchNo string    `json:"materialBatchNo,omitempty" db:"material_batch_no"`
	MaterialName    string    `json:"materialName,omitempty" db:"material_name"`
	MaterialCode    string    `json:"materialCode,omitempty" db:"material_code"`
}

type InspectionStandard struct {
	ID             uint64          `json:"id" db:"id"`
	StdCode        string          `json:"stdCode" db:"std_code"`
	StdName        string          `json:"stdName" db:"std_name"`
	TargetType     int             `json:"targetType" db:"target_type"`
	TargetID       uint64          `json:"targetId" db:"target_id"`
	InspectionType int             `json:"inspectionType" db:"inspection_type"`
	InspectionMode int             `json:"inspectionMode" db:"inspection_mode"`
	SamplingRatio  *float64        `json:"samplingRatio,omitempty" db:"sampling_ratio"`
	Items          json.RawMessage `json:"items" db:"items"`
	Status         int             `json:"status" db:"status"`
	Version        string          `json:"version" db:"version"`
	EffectiveDate  string          `json:"effectiveDate,omitempty" db:"effective_date"`
	CreatedBy      string          `json:"createdBy,omitempty" db:"created_by"`
	Description    string          `json:"description,omitempty" db:"description"`
	CreatedAt      time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time       `json:"updatedAt" db:"updated_at"`
}

type InspectionRecord struct {
	ID             uint64            `json:"id" db:"id"`
	InspectionNo   string            `json:"inspectionNo" db:"inspection_no"`
	InspectionType int               `json:"inspectionType" db:"inspection_type"`
	TargetBatchID  uint64            `json:"targetBatchId" db:"target_batch_id"`
	TargetBatchNo  string            `json:"targetBatchNo" db:"target_batch_no"`
	StandardID     *uint64           `json:"standardId,omitempty" db:"standard_id"`
	InspectQty     float64           `json:"inspectQty" db:"inspect_qty"`
	QualifiedQty   float64           `json:"qualifiedQty" db:"qualified_qty"`
	DefectQty      float64           `json:"defectQty" db:"defect_qty"`
	Result         int               `json:"result" db:"result"`
	Inspector      string            `json:"inspector" db:"inspector"`
	InspectTime    time.Time         `json:"inspectTime" db:"inspect_time"`
	Remark         string            `json:"remark,omitempty" db:"remark"`
	CreatedAt      time.Time         `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time         `json:"updatedAt" db:"updated_at"`
	Items          []InspectionItem  `json:"items,omitempty" db:"-"`
	StdName        string            `json:"stdName,omitempty" db:"-"`
}

type InspectionItem struct {
	ID            uint64 `json:"id" db:"id"`
	RecordID      uint64 `json:"recordId" db:"record_id"`
	ItemName      string `json:"itemName" db:"item_name"`
	StandardValue string `json:"standardValue,omitempty" db:"standard_value"`
	ActualValue   string `json:"actualValue,omitempty" db:"actual_value"`
	Unit          string `json:"unit,omitempty" db:"unit"`
	Result        int    `json:"result" db:"result"`
	Method        string `json:"method,omitempty" db:"method"`
	Memo          string `json:"memo,omitempty" db:"memo"`
	CreatedAt     string `json:"createdAt" db:"created_at"`
}

type DefectRecord struct {
	ID            uint64             `json:"id" db:"id"`
	DefectNo      string             `json:"defectNo" db:"defect_no"`
	DefectType    int                `json:"defectType" db:"defect_type"`
	TargetBatchID uint64             `json:"targetBatchId" db:"target_batch_id"`
	TargetBatchNo string             `json:"targetBatchNo" db:"target_batch_no"`
	InspectionID  *uint64            `json:"inspectionId,omitempty" db:"inspection_id"`
	DefectCode    string             `json:"defectCode,omitempty" db:"defect_code"`
	DefectName    string             `json:"defectName" db:"defect_name"`
	DefectDesc    string             `json:"defectDesc,omitempty" db:"defect_desc"`
	Severity      int                `json:"severity" db:"severity"`
	DefectQty     float64            `json:"defectQty" db:"defect_qty"`
	Reporter      string             `json:"reporter" db:"reporter"`
	ReportTime    time.Time          `json:"reportTime" db:"report_time"`
	ProcessStatus int                `json:"processStatus" db:"process_status"`
	Responsible   string             `json:"responsible,omitempty" db:"responsible"`
	Remark        string             `json:"remark,omitempty" db:"remark"`
	CreatedAt     time.Time          `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time          `json:"updatedAt" db:"updated_at"`
	Dispositions  []DefectDisposition `json:"dispositions,omitempty" db:"-"`
}

type DefectDisposition struct {
	ID              uint64     `json:"id" db:"id"`
	DefectID        uint64     `json:"defectId" db:"defect_id"`
	DispositionType int        `json:"dispositionType" db:"disposition_type"`
	DispositionQty  float64    `json:"dispositionQty" db:"disposition_qty"`
	Handler         string     `json:"handler" db:"handler"`
	HandleTime      time.Time  `json:"handleTime" db:"handle_time"`
	Approver        string     `json:"approver,omitempty" db:"approver"`
	ApproveTime     *time.Time `json:"approveTime,omitempty" db:"approve_time"`
	ApproveStatus   int        `json:"approveStatus" db:"approve_status"`
	Reason          string     `json:"reason,omitempty" db:"reason"`
	ReworkBatchNo   string     `json:"reworkBatchNo,omitempty" db:"rework_batch_no"`
	Cost            *float64   `json:"cost,omitempty" db:"cost"`
	Result          string     `json:"result,omitempty" db:"result"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time  `json:"updatedAt" db:"updated_at"`
}

type TraceForwardResult struct {
	ProdBatch    ProductionBatch     `json:"prodBatch"`
	MaterialUsed []BatchMaterialLink `json:"materialUsed"`
	ProcessLogs  []ProductionLog     `json:"processLogs"`
	Inspections  []InspectionRecord  `json:"inspections"`
	Defects      []DefectRecord      `json:"defects"`
	FromCache    bool                `json:"fromCache"`
}

type TraceBackwardResult struct {
	MaterialBatch MaterialBatch       `json:"materialBatch"`
	ProdBatches   []BatchMaterialLink `json:"prodBatches"`
	Inspections   []InspectionRecord  `json:"inspections"`
	Defects       []DefectRecord      `json:"defects"`
	FromCache     bool                `json:"fromCache"`
}

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PageRequest struct {
	Page     int    `json:"page" query:"page"`
	PageSize int    `json:"pageSize" query:"pageSize"`
	Keyword  string `json:"keyword" query:"keyword"`
}

type PageResponse struct {
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"pageSize"`
	List     interface{} `json:"list"`
}
