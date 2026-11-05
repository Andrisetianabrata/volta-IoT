package seed

import (
	"testing"

	"volta/auth"
	"volta/storage"
)

func TestSeedDemoIdempotent(t *testing.T) {
	db, err := storage.NewSqliteStorage(t.TempDir()+"/t.db", 5000)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if ok, err := auth.SeedAdmin(db); err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if ok, err := SeedDemo(db); err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	if ok, err := SeedDemo(db); err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	admin, _ := db.GetUserByEmail("admin@admin.com")
	boards, _ := db.ListDashboards(admin.ID)
	found := false
	for _, d := range boards {
		if d.Name == DemoBoardName {
			found = true
		}
	}
	if !found {
		t.Fatal("demo board missing")
	}
	ws, _ := db.ListWidgets("demo-board-1")
	if len(ws) != 6 {
		t.Fatalf("widgets=%d", len(ws))
	}
	if p, _ := db.GetPin("demo-ruang-a", "t1"); p == nil {
		t.Fatal("demo pin missing")
	}
}
