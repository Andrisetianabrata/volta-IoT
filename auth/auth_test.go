package auth

import (
	"path/filepath"
	"sync"
	"testing"

	"volta/storage"
)

func mem(t *testing.T) storage.Storage {
	t.Helper()
	db, err := storage.NewSqliteStorage(filepath.Join(t.TempDir(), "t.db"), 5000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestSeedAdminIdempotent(t *testing.T) {
	db := mem(t)
	ok, err := SeedAdmin(db)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	ok, err = SeedAdmin(db)
	if err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if _, err := Login(db, "admin@admin.com", "admin123"); err != nil {
		t.Fatal(err)
	}
}

func TestRegisterLoginRoundtrip(t *testing.T) {
	db := mem(t)
	if _, err := Register(db, "u@x.co", "password123"); err != nil {
		t.Fatal(err)
	}
	if _, err := Register(db, "u@x.co", "password123"); err != ErrExists {
		t.Fatalf("want ErrExists got %v", err)
	}
	sid, err := Login(db, "u@x.co", "password123")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := UserIDForSession(db, sid); err != nil {
		t.Fatal(err)
	}
	if _, err := Login(db, "u@x.co", "wrongpass1"); err == nil {
		t.Fatal("want error")
	}
}

func TestTokenIs32Alnum(t *testing.T) {
	for i := 0; i < 50; i++ {
		tok := GenerateToken()
		if len(tok) != 32 {
			t.Fatalf("len=%d", len(tok))
		}
		for _, c := range tok {
			if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
				t.Fatalf("bad char %c", c)
			}
		}
	}
}

func TestIssueValidateRevoke(t *testing.T) {
	db := mem(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	live := &sync.Map{}
	tok, err := IssueForDevice(db, "d1")
	if err != nil {
		t.Fatal(err)
	}
	dev, err := Validate(db, tok, live)
	if err != nil || dev != "d1" {
		t.Fatalf("dev=%q err=%v", dev, err)
	}
	if err := Revoke(db, tok, live); err != nil {
		t.Fatal(err)
	}
	if _, err := Validate(db, tok, live); err != ErrTokenRevoked {
		t.Fatalf("want revoked got %v", err)
	}
}

func TestAuthenticateRejectsBadToken(t *testing.T) {
	db := mem(t)
	live := &sync.Map{}
	if _, err := Validate(db, "short", live); err == nil {
		t.Fatal("want error")
	}
}
