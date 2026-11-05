package http

import (
	"encoding/json"
	"net/http"
)

type ApiError struct {
	Status  int
	Code    string
	Message string
}

func (e *ApiError) Error() string { return e.Code + ": " + e.Message }

func NewApiError(status int, code, message string) *ApiError {
	return &ApiError{Status: status, Code: code, Message: message}
}

func BadRequest(code, message string) *ApiError {
	return NewApiError(http.StatusBadRequest, code, message)
}

func Unauthorized(message string) *ApiError {
	return NewApiError(http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func NotFound(message string) *ApiError {
	return NewApiError(http.StatusNotFound, "NOT_FOUND", message)
}

func writeError(w http.ResponseWriter, err error) {
	if api, ok := err.(*ApiError); ok {
		writeJSON(w, api.Status, map[string]any{"error": map[string]string{"code": api.Code, "message": api.Message}})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]any{"error": map[string]string{"code": "DB_ERROR", "message": err.Error()}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	return dec.Decode(v)
}
