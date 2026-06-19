package utils

import (
	"encoding/json"
	"net/http"
	"qualitytrace/models"

	"github.com/labstack/echo/v4"
)

func OK(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, models.Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

func Fail(c echo.Context, code int, message string) error {
	return c.JSON(http.StatusOK, models.Response{
		Code:    code,
		Message: message,
	})
}

func PageResult(list interface{}, total int64, page, pageSize int) models.PageResponse {
	return models.PageResponse{
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		List:     list,
	}
}

func ToJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
