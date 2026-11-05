package storage

import (
	"path/filepath"
	"testing"
)

func mem(t *testing.T) *SqliteStorage {
	t.Helper()
	db, err := NewSqliteStorage(filepath.Join(t.TempDir(), "t.db"), 5000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestUserSessionCRUD(t *testing.T) {
	s := mem(t)
	now := NowUnix()
	if err := s.CreateUser("u1", "a@b.c", "h", now); err != nil {
		t.Fatal(err)
	}
	if u, _ := s.GetUserByEmail("a@b.c"); u == nil {
		t.Fatal("missing user")
	}
	if err := s.CreateSession("s1", "u1", now, now+3600); err != nil {
		t.Fatal(err)
	}
	if x, _ := s.GetSession("s1"); x == nil {
		t.Fatal("missing session")
	}
	if err := s.DeleteSession("s1"); err != nil {
		t.Fatal(err)
	}
	if x, _ := s.GetSession("s1"); x != nil {
		t.Fatal("session not deleted")
	}
}

func TestDeviceTokenPinFlow(t *testing.T) {
	s := mem(t)
	now := NowUnix()
	_ = s.CreateUser("u1", "a@b.c", "h", now)
	_ = s.CreateDevice("d1", "u1", "esp", now)
	_ = s.IssueToken(repeatT(), "d1", now)
	_ = s.UpsertPin("d1", "V0", "1", now)
	_ = s.InsertHistory("d1", "V0", "1", now)
	pins, err := s.ListPins("d1")
	if err != nil || len(pins) != 1 {
		t.Fatalf("pins=%v err=%v", pins, err)
	}
	h, err := s.QueryHistory("d1", "V0", 0, now+10, 100)
	if err != nil || len(h) != 1 {
		t.Fatalf("hist=%v err=%v", h, err)
	}
	_ = s.SetStatus("d1", true, now)
	st, _ := s.GetStatus("d1")
	if st == nil || st.Online != 1 {
		t.Fatalf("status=%+v", st)
	}
}

func repeatT() string {
	b := make([]byte, 32)
	for i := range b {
		b[i] = 't'
	}
	return string(b)
}

func TestValidTokensExcludeRevoked(t *testing.T) {
	s := mem(t)
	now := NowUnix()
	_ = s.CreateUser("u1", "a@b.c", "h", now)
	_ = s.CreateDevice("d1", "u1", "esp", now)
	a := repeat('a')
	b := repeat('b')
	_ = s.IssueToken(a, "d1", now)
	_ = s.IssueToken(b, "d1", now)
	_ = s.RevokeToken(a)
	toks, err := s.ListValidTokens()
	if err != nil || len(toks) != 1 || toks[0] != b {
		t.Fatalf("toks=%v err=%v", toks, err)
	}
	if on, _ := s.ListOnlineDeviceIDs(); len(on) != 0 {
		t.Fatalf("online=%v", on)
	}
	_ = s.SetStatus("d1", true, now)
	if on, _ := s.ListOnlineDeviceIDs(); len(on) != 1 || on[0] != "d1" {
		t.Fatalf("online=%v", on)
	}
}

func repeat(c byte) string {
	b := make([]byte, 32)
	for i := range b {
		b[i] = c
	}
	return string(b)
}

func TestWidgetCRUDRoundtrip(t *testing.T) {
	s := mem(t)
	now := NowUnix()
	_ = s.CreateUser("u1", "a@b.c", "h", now)
	_ = s.CreateDashboard("db1", "u1", "main", now)
	if d, _ := s.GetDashboard("db1"); d == nil {
		t.Fatal("missing dashboard")
	}
	if d, _ := s.GetDashboard("nope"); d != nil {
		t.Fatal("ghost dashboard")
	}
	_ = s.CreateWidget("w1", "db1", "Gauge", "V0", "{}")
	w, _ := s.GetWidget("w1")
	if w == nil || w.Kind != "Gauge" {
		t.Fatalf("w=%+v", w)
	}
	_ = s.UpdateWidget("w1", "Button", "V1", `{"max":100}`)
	w, _ = s.GetWidget("w1")
	if w.Kind != "Button" || w.Pin != "V1" {
		t.Fatalf("w=%+v", w)
	}
	_ = s.DeleteWidget("w1")
	if w, _ := s.GetWidget("w1"); w != nil {
		t.Fatal("widget not deleted")
	}
}

func TestDashboardWidgetMailRule(t *testing.T) {
	s := mem(t)
	now := NowUnix()
	_ = s.CreateUser("u1", "a@b.c", "h", now)
	_ = s.CreateDashboard("db1", "u1", "main", now)
	_ = s.CreateWidget("w1", "db1", "Button", "V0", "{}")
	ds, _ := s.ListDashboards("u1")
	if len(ds) != 1 {
		t.Fatalf("ds=%v", ds)
	}
	_, _ = s.EnqueueMail("a@b.c", "hi", "body", now)
	if c, _ := s.MailPendingCount(); c != 1 {
		t.Fatalf("pending=%d", c)
	}
	r := Rule{ID: "r1", UserID: "u1", DeviceID: "d1", Pin: "V0", Op: "gt", Threshold: 5, Action: "notify", Enabled: 1}
	if err := s.CreateRule(r); err != nil {
		t.Fatal(err)
	}
	rs, _ := s.ListRules("u1")
	if len(rs) != 1 {
		t.Fatalf("rules=%v", rs)
	}
}
