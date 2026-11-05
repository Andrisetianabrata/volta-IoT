package pins

import (
	"testing"
	"time"

	"volta/storage"
	storagesql "volta/storage"
)

func memStorage(t *testing.T) storage.Storage {
	t.Helper()
	db, err := storagesql.NewSqliteStorage(t.TempDir()+"/t.db", 5000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestStatePublishStoredAndBroadcast(t *testing.T) {
	db := memStorage(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	bus := NewPinBus(16)
	rx, unsub := bus.Subscribe()
	defer unsub()
	if err := HandlePublish(db, bus, "d1", "volta/dev/d1/state/V0", "42"); err != nil {
		t.Fatal(err)
	}
	p, _ := db.GetPin("d1", "V0")
	if p == nil || p.Value != "42" {
		t.Fatalf("pin=%+v", p)
	}
	select {
	case ev := <-rx:
		if ev.Value != "42" {
			t.Fatalf("ev=%+v", ev)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no broadcast")
	}
	if err := HandlePublish(db, bus, "d2", "volta/dev/d1/state/V0", "1"); err == nil {
		t.Fatal("want acl error")
	}
}

func TestCmdSendReceived(t *testing.T) {
	bus := NewCommandBus(16)
	rx, unsub := bus.Subscribe()
	defer unsub()
	if err := bus.Send(CmdRequest{DeviceID: "d1", Pin: "V0", Value: "1"}, 50*time.Millisecond); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-rx:
		if got.Pin != "V0" {
			t.Fatalf("got=%+v", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no cmd")
	}
	if bus.Metrics.Sent() != 1 {
		t.Fatalf("sent=%d", bus.Metrics.Sent())
	}
}
