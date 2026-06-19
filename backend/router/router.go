package router

import (
	"qualitytrace/handlers"
	"qualitytrace/middleware"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func New() *echo.Echo {
	e := echo.New()

	e.HideBanner = true

	e.Use(middleware.DebugLogger())
	e.Use(middleware.CORS())
	e.Use(echoMiddleware.Recover())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]interface{}{
			"status":  "ok",
			"service": "QualityTrace API",
			"version": "1.0.0",
		})
	})

	api := e.Group("/api")

	api.GET("/dashboard", handlers.GetDashboardStats)

	base := api.Group("/base")
	{
		base.GET("/materials", handlers.GetMaterialList)
		base.GET("/material-batches", handlers.GetMaterialBatchList)
		base.POST("/material-batches", handlers.CreateMaterialBatch)
		base.GET("/products", handlers.GetProductList)
		base.GET("/production-batches", handlers.GetProductionBatchList)
		base.POST("/production-batches", handlers.CreateProductionBatch)
		base.GET("/equipment", handlers.GetEquipmentList)
		base.GET("/work-shifts", handlers.GetWorkShiftList)
		base.GET("/production-logs", handlers.GetProductionLogs)
		base.GET("/batch-materials", handlers.GetBatchMaterialLinks)
	}

	inspection := api.Group("/inspection")
	{
		inspection.GET("/standards", handlers.GetInspectionStandards)
		inspection.GET("/records", handlers.GetInspectionRecords)
		inspection.GET("/records/:id", handlers.GetInspectionRecordDetail)
		inspection.POST("/records", handlers.CreateInspectionRecord)
		inspection.GET("/stats", handlers.GetInspectionStats)
	}

	defect := api.Group("/defect")
	{
		defect.GET("/records", handlers.GetDefectRecords)
		defect.GET("/records/:id", handlers.GetDefectRecordDetail)
		defect.POST("/records", handlers.CreateDefectRecord)
		defect.POST("/dispositions", handlers.CreateDefectDisposition)
		defect.POST("/dispositions/:id/approve", handlers.ApproveDefectDisposition)
		defect.GET("/stats", handlers.GetDefectStats)
	}

	trace := api.Group("/trace")
	{
		trace.GET("/forward", handlers.TraceForward)
		trace.GET("/backward", handlers.TraceBackward)
		trace.DELETE("/cache", handlers.ClearTraceCache)
	}

	return e
}
