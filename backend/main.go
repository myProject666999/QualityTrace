package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"qualitytrace/config"
	"qualitytrace/database"
	"qualitytrace/router"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile | log.Lmicroseconds)

	log.Println("========================================")
	log.Println("  Quality Trace System - Starting")
	log.Println("========================================")

	database.InitMySQL()
	database.InitRedis()
	defer database.Close()

	e := router.New()

	if config.AppConfig.Server.Debug {
		log.Println("[DEBUG] Debug mode is ENABLED")
		log.Printf("[DEBUG] MySQL: %s:%s/%s",
			config.AppConfig.MySQL.Host,
			config.AppConfig.MySQL.Port,
			config.AppConfig.MySQL.Database)
		log.Printf("[DEBUG] Redis: %s:%s (DB=%d)",
			config.AppConfig.Redis.Host,
			config.AppConfig.Redis.Port,
			config.AppConfig.Redis.DB)
	}

	srv := &http.Server{
		Addr:         config.AppConfig.Server.Port,
		Handler:      e,
		ReadTimeout:  time.Duration(config.AppConfig.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(config.AppConfig.Server.WriteTimeout) * time.Second,
	}

	go func() {
		log.Printf("[INFO] HTTP server listening on %s", config.AppConfig.Server.Port)
		if err := e.StartServer(srv); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] HTTP server error: %v", err)
		}
	}()

	fmt.Println("")
	fmt.Println("  API Endpoints:")
	fmt.Println("  ----------------------------------------")
	fmt.Println("  GET   /health                            -> 健康检查")
	fmt.Println("  GET   /api/dashboard                     -> 仪表盘统计")
	fmt.Println("")
	fmt.Println("  --- 基础数据 ---")
	fmt.Println("  GET   /api/base/materials                -> 物料列表")
	fmt.Println("  GET   /api/base/material-batches         -> 物料批次列表")
	fmt.Println("  GET   /api/base/products                 -> 产品列表")
	fmt.Println("  GET   /api/base/production-batches       -> 生产批次列表")
	fmt.Println("  GET   /api/base/equipment                -> 设备列表")
	fmt.Println("  GET   /api/base/work-shifts              -> 班组列表")
	fmt.Println("  GET   /api/base/production-logs          -> 生产日志")
	fmt.Println("  GET   /api/base/batch-materials          -> 批次物料关联")
	fmt.Println("  POST  /api/base/production-batches       -> 新增生产批次")
	fmt.Println("  POST  /api/base/material-batches         -> 新增物料批次")
	fmt.Println("")
	fmt.Println("  --- 检验录入 ---")
	fmt.Println("  GET   /api/inspection/standards          -> 检验标准列表")
	fmt.Println("  GET   /api/inspection/records            -> 检验记录列表")
	fmt.Println("  GET   /api/inspection/records/:id        -> 检验记录详情")
	fmt.Println("  POST  /api/inspection/records            -> 新增检验记录")
	fmt.Println("  GET   /api/inspection/stats              -> 检验统计")
	fmt.Println("")
	fmt.Println("  --- 不良品处理 ---")
	fmt.Println("  GET   /api/defect/records                -> 不良记录列表")
	fmt.Println("  GET   /api/defect/records/:id            -> 不良详情")
	fmt.Println("  POST  /api/defect/records                -> 新增不良记录")
	fmt.Println("  POST  /api/defect/dispositions           -> 不良处置")
	fmt.Println("  POST  /api/defect/dispositions/:id/approve -> 审批处置")
	fmt.Println("  GET   /api/defect/stats                  -> 不良统计")
	fmt.Println("")
	fmt.Println("  --- 追溯查询 ---")
	fmt.Println("  GET   /api/trace/forward?batchNo=...     -> 正向追溯（成品→上游）")
	fmt.Println("  GET   /api/trace/backward?batchNo=...    -> 反向追溯（原料→下游）")
	fmt.Println("  DELETE /api/trace/cache                  -> 清除追溯缓存")
	fmt.Println("")
	fmt.Println("  追溯测试:")
	fmt.Println("    正向: http://localhost:8080/api/trace/forward?batchNo=PB-20260618-001")
	fmt.Println("    反向: http://localhost:8080/api/trace/backward?batchNo=MB-20260616-003")
	fmt.Println("  ========================================")
	fmt.Println("")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[INFO] Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Fatalf("[FATAL] Server shutdown error: %v", err)
	}
	log.Println("[INFO] Server exited gracefully")
}
