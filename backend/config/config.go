package config

type Config struct {
	Server ServerConfig
	MySQL  MySQLConfig
	Redis  RedisConfig
}

type ServerConfig struct {
	Port         string
	Mode         string
	Debug        bool
	ReadTimeout  int
	WriteTimeout int
}

type MySQLConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
	Charset  string
	MaxOpen  int
	MaxIdle  int
	LogMode  bool
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	PoolSize int
	CacheTTL int
}

var AppConfig = Config{
	Server: ServerConfig{
		Port:         ":8088",
		Mode:         "debug",
		Debug:        true,
		ReadTimeout:  30,
		WriteTimeout: 30,
	},
	MySQL: MySQLConfig{
		Host:     "127.0.0.1",
		Port:     "3306",
		User:     "root",
		Password: "123456",
		Database: "quality_trace",
		Charset:  "utf8mb4",
		MaxOpen:  100,
		MaxIdle:  20,
		LogMode:  true,
	},
	Redis: RedisConfig{
		Host:     "127.0.0.1",
		Port:     "6379",
		Password: "",
		DB:       0,
		PoolSize: 50,
		CacheTTL: 3600,
	},
}
