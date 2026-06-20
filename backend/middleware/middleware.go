package middleware

import (
	"log"
	"qualitytrace/database"
	"time"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func DBHealthCheck() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			database.EnsureDBConnection()
			return next(c)
		}
	}
}

func DebugLogger() echo.MiddlewareFunc {
	return echoMiddleware.RequestLoggerWithConfig(echoMiddleware.RequestLoggerConfig{
		LogURI:       true,
		LogStatus:    true,
		LogMethod:    true,
		LogLatency:   true,
		LogRemoteIP:  true,
		LogUserAgent: false,
		LogValuesFunc: func(c echo.Context, v echoMiddleware.RequestLoggerValues) error {
			log.Printf("[DEBUG] %3d | %13v | %15s | %-7s %s | err=%v",
				v.Status,
				v.Latency.Round(time.Millisecond),
				v.RemoteIP,
				v.Method,
				v.URI,
				v.Error,
			)
			return nil
		},
	})
}

func CORS() echo.MiddlewareFunc {
	return echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
			echo.HeaderXRequestedWith,
		},
		ExposeHeaders: []string{
			echo.HeaderContentLength,
		},
		MaxAge: 86400,
	})
}
