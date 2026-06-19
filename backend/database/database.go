package database

import (
	"fmt"
	"log"
	"qualitytrace/config"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql"
	goredis "github.com/redis/go-redis/v9"
)

var (
	DB     *sqlx.DB
	Redis  *goredis.Client
	dbOnce sync.Once
	rdOnce sync.Once
)

func InitMySQL() {
	dbOnce.Do(func() {
		cfg := config.AppConfig.MySQL
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=True&loc=Local&multiStatements=true",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Database, cfg.Charset)

		var err error
		DB, err = sqlx.Connect("mysql", dsn)
		if err != nil {
			log.Fatalf("[FATAL] MySQL connection failed: %v", err)
		}

		DB.SetMaxOpenConns(cfg.MaxOpen)
		DB.SetMaxIdleConns(cfg.MaxIdle)
		DB.SetConnMaxLifetime(time.Hour)

		if err = DB.Ping(); err != nil {
			log.Fatalf("[FATAL] MySQL ping failed: %v", err)
		}

		log.Printf("[DEBUG] MySQL connected: host=%s port=%s db=%s", cfg.Host, cfg.Port, cfg.Database)
	})
}

func InitRedis() {
	rdOnce.Do(func() {
		cfg := config.AppConfig.Redis
		Redis = goredis.NewClient(&goredis.Options{
			Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
			Password: cfg.Password,
			DB:       cfg.DB,
			PoolSize: cfg.PoolSize,
		})
		log.Printf("[DEBUG] Redis client created: host=%s port=%s db=%d (connecting lazily)", cfg.Host, cfg.Port, cfg.DB)
	})
}

func Close() {
	if DB != nil {
		DB.Close()
		log.Println("[DEBUG] MySQL connection closed")
	}
	if Redis != nil {
		Redis.Close()
		log.Println("[DEBUG] Redis connection closed")
	}
}
