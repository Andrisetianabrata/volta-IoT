package auth

import (
	"crypto/rand"
	"errors"
	"sync"

	"volta/storage"
)

var (
	ErrTokenUnknown = errors.New("token tidak dikenal")
	ErrTokenRevoked = errors.New("token direvoke")
)

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

func GenerateToken() string {
	var b [32]byte
	rb := make([]byte, 32)
	if _, err := rand.Read(rb); err != nil {
		panic(err)
	}
	for i := range b {
		b[i] = alphabet[int(rb[i])%len(alphabet)]
	}
	return string(b[:])
}

func IssueForDevice(db storage.Storage, deviceID string) (string, error) {
	t := GenerateToken()
	if err := db.IssueToken(t, deviceID, storage.NowUnix()); err != nil {
		return "", err
	}
	return t, nil
}

func Validate(db storage.Storage, token string, live *sync.Map) (string, error) {
	if len(token) != 32 {
		return "", ErrTokenUnknown
	}
	if _, ok := live.Load("revoked:" + token); ok {
		return "", ErrTokenRevoked
	}
	rec, err := db.LookupToken(token)
	if err != nil {
		return "", err
	}
	if rec == nil {
		return "", ErrTokenUnknown
	}
	if rec.Revoked != 0 {
		return "", ErrTokenRevoked
	}
	return rec.DeviceID, nil
}

func Revoke(db storage.Storage, token string, live *sync.Map) error {
	if err := db.RevokeToken(token); err != nil {
		return err
	}
	live.Store("revoked:"+token, struct{}{})
	return nil
}
