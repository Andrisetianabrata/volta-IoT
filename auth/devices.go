package auth

import (
	"github.com/google/uuid"

	"volta/storage"
)

func CreateDeviceWithToken(db storage.Storage, userID, name string) (string, string, error) {
	dev := uuid.NewString()
	if err := db.CreateDevice(dev, userID, name, storage.NowUnix()); err != nil {
		return "", "", err
	}
	tok, err := IssueForDevice(db, dev)
	if err != nil {
		return "", "", err
	}
	return dev, tok, nil
}
