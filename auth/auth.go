package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"volta/storage"
)

var (
	ErrExists  = errors.New("email sudah terdaftar")
	ErrInvalid = errors.New("kredensial salah")
	ErrExpired = errors.New("sesi kedaluwarsa")
	sessionTTL = 30 * 24 * time.Hour
)

func HashPassword(email, password string) string {
	h := sha256.New()
	h.Write([]byte(strings.ToLower(email)))
	h.Write([]byte(":"))
	h.Write([]byte(password))
	return hex.EncodeToString(h.Sum(nil))
}

func Register(db storage.Storage, email, password string) (string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if !strings.Contains(email, "@") || len(password) < 8 {
		return "", ErrInvalid
	}
	if u, err := db.GetUserByEmail(email); err != nil {
		return "", err
	} else if u != nil {
		return "", ErrExists
	}
	uid := uuid.NewString()
	if err := db.CreateUser(uid, email, HashPassword(email, password), storage.NowUnix()); err != nil {
		return "", err
	}
	return uid, nil
}

func Login(db storage.Storage, email, password string) (string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	user, err := db.GetUserByEmail(email)
	if err != nil {
		return "", err
	}
	if user == nil || user.PassHash != HashPassword(email, password) {
		return "", ErrInvalid
	}
	sid := uuid.NewString()
	now := storage.NowUnix()
	if err := db.CreateSession(sid, user.ID, now, now+int64(sessionTTL.Seconds())); err != nil {
		return "", err
	}
	return sid, nil
}

func UserIDForSession(db storage.Storage, session string) (string, error) {
	s, err := db.GetSession(session)
	if err != nil {
		return "", err
	}
	if s == nil {
		return "", ErrInvalid
	}
	if s.ExpiresAt < storage.NowUnix() {
		return "", ErrExpired
	}
	return s.UserID, nil
}

func SeedAdmin(db storage.Storage) (bool, error) {
	if u, err := db.GetUserByEmail("admin@admin.com"); err != nil {
		return false, err
	} else if u != nil {
		return false, nil
	}
	if _, err := Register(db, "admin@admin.com", "admin123"); err != nil {
		return false, err
	}
	return true, nil
}
