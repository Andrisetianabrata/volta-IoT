package broker

import (
	"fmt"
	"io"
	"net"
	"testing"
	"time"

	"volta/pins"
	"volta/storage"
)

func memDB(t *testing.T) storage.Storage {
	t.Helper()
	db, err := storage.NewSqliteStorage(t.TempDir()+"/t.db", 5000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestCmdTopicFormat(t *testing.T) {
	if got := CmdTopic("d1", "V0"); got != "volta/dev/d1/cmd/V0" {
		t.Fatalf("got %s", got)
	}
}

func TestStatusPayloadMapping(t *testing.T) {
	if !StatusIsOnline([]byte("online")) || StatusIsOnline([]byte("offline")) || StatusIsOnline([]byte("")) {
		t.Fatal("mapping")
	}
}

func TestTokenCacheAllowsValidOnly(t *testing.T) {
	c := NewTokenCache()
	c.Replace(map[string]struct{}{"tok": {}})
	if !c.Contains("tok") || c.Contains("nope") {
		t.Fatal("cache")
	}
}

func TestLoadTokensFromDB(t *testing.T) {
	db := memDB(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	_ = db.IssueToken(repeatT(), "d1", now)
	set, err := LoadValidTokens(db)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := set[repeatT()]; !ok || len(set) != 1 {
		t.Fatalf("set=%v", set)
	}
}

func repeatT() string {
	b := make([]byte, 32)
	for i := range b {
		b[i] = 't'
	}
	return string(b)
}

func repeatC(c byte) string {
	b := make([]byte, 32)
	for i := range b {
		b[i] = c
	}
	return string(b)
}

func mqttStr(s string, out *[]byte) {
	*out = append(*out, byte(len(s)>>8), byte(len(s)))
	*out = append(*out, s...)
}

func mqttConnect(clientID, user, pass string) []byte {
	var body []byte
	body = append(body, 0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04, 0xC2, 0x00, 0x3C)
	mqttStr(clientID, &body)
	mqttStr(user, &body)
	mqttStr(pass, &body)
	pkt := []byte{0x10, byte(len(body))}
	return append(pkt, body...)
}

func mqttPublish(topic string, payload []byte) []byte {
	var body []byte
	mqttStr(topic, &body)
	body = append(body, payload...)
	pkt := []byte{0x30, byte(len(body))}
	return append(pkt, body...)
}

func mqttPublishRetain(topic string, payload []byte) []byte {
	var body []byte
	mqttStr(topic, &body)
	body = append(body, payload...)
	pkt := []byte{0x31, byte(len(body))}
	return append(pkt, body...)
}

func mqttSubscribe(topic string) []byte {
	var body []byte
	body = append(body, 0x00, 0x01)
	mqttStr(topic, &body)
	body = append(body, 0x00)
	pkt := []byte{0x82, byte(len(body))}
	return append(pkt, body...)
}

func readExact(t *testing.T, conn net.Conn, n int, what string) []byte {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	buf := make([]byte, n)
	if _, err := io.ReadFull(conn, buf); err != nil {
		t.Fatalf("gagal baca %s: %s", what, err)
	}
	return buf
}

func waitFor(t *testing.T, what string, fn func() bool) {
	t.Helper()
	for i := 0; i < 50; i++ {
		if fn() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("%s tidak terjadi", what)
}

func TestEmbeddedBrokerEndToEnd(t *testing.T) {
	db := memDB(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	token := repeatT()
	_ = db.IssueToken(token, "d1", now)

	cache := NewTokenCache()
	cache.Replace(map[string]struct{}{token: {}})
	bus := pins.DefaultBus()
	cmds := pins.NewCommandBus(16)
	stop := make(chan struct{})
	defer close(stop)
	go ServeForever(db, bus, cmds, 19883, cache, 90*time.Second, stop)
	time.Sleep(700 * time.Millisecond)

	ok, err := net.DialTimeout("tcp", "127.0.0.1:19883", 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer ok.Close()
	if _, err := ok.Write(mqttConnect("dev1", token, token)); err != nil {
		t.Fatal(err)
	}
	if connack := readExact(t, ok, 4, "connack-ok"); string(connack) != string([]byte{0x20, 0x02, 0x00, 0x00}) {
		t.Fatalf("connack=%v", connack)
	}

	bad, err := net.DialTimeout("tcp", "127.0.0.1:19883", 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer bad.Close()
	if _, err := bad.Write(mqttConnect("devX", repeatC('z'), repeatC('z'))); err != nil {
		t.Fatal(err)
	}
	_ = bad.SetReadDeadline(time.Now().Add(3 * time.Second))
	rc := make([]byte, 4)
	if _, err := io.ReadFull(bad, rc); err != nil {
		t.Fatalf("tidak ada connack untuk token salah: %s", err)
	}
	if rc[3] == 0x00 {
		t.Fatal("token salah malah diterima")
	}

	if _, err := ok.Write(mqttPublish("volta/dev/d1/state/V0", []byte("23.5"))); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "state tidak masuk DB", func() bool {
		p, _ := db.GetPin("d1", "V0")
		return p != nil && p.Value == "23.5"
	})

	if _, err := ok.Write(mqttSubscribe("volta/dev/d1/cmd/V0")); err != nil {
		t.Fatal(err)
	}
	suback := readExact(t, ok, 5, "suback")
	if suback[0] != 0x90 {
		t.Fatalf("suback=%v", suback)
	}
	if err := cmds.Send(pins.CmdRequest{DeviceID: "d1", Pin: "V0", Value: "1"}, 2*time.Second); err != nil {
		t.Fatal(err)
	}
	hdr := readExact(t, ok, 2, "pub-head")
	if hdr[0]&0xF0 != 0x30 {
		t.Fatalf("hdr=%v", hdr)
	}
	body := readExact(t, ok, int(hdr[1]), "pub-body")
	tlen := int(body[0])<<8 | int(body[1])
	if string(body[2:2+tlen]) != "volta/dev/d1/cmd/V0" {
		t.Fatalf("topic=%s", body[2:2+tlen])
	}
	if string(body[2+tlen:]) != "1" {
		t.Fatalf("payload=%s", body[2+tlen:])
	}

	if _, err := ok.Write(mqttPublish("volta/dev/d1/status", []byte("offline"))); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "status offline tidak tercatat", func() bool {
		s, _ := db.GetStatus("d1")
		return s != nil && s.Online == 0
	})
}

func TestResetStalePresenceClearsOnline(t *testing.T) {
	db := memDB(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	_ = db.SetStatus("d1", true, now)
	if on, _ := db.ListOnlineDeviceIDs(); len(on) != 1 {
		t.Fatalf("online=%v", on)
	}
	ResetStalePresence(db)
	if on, _ := db.ListOnlineDeviceIDs(); len(on) != 0 {
		t.Fatalf("online=%v", on)
	}
	if s, _ := db.GetStatus("d1"); s == nil || s.Online != 0 {
		t.Fatalf("status=%+v", s)
	}
}

func TestPresenceSweeperMarksSilentOffline(t *testing.T) {
	db := memDB(t)
	now := storage.NowUnix()
	_ = db.CreateUser("u1", "a@b.c", "h", now)
	_ = db.CreateDevice("d1", "u1", "esp", now)
	token := repeatC('k')
	_ = db.IssueToken(token, "d1", now)
	cache := NewTokenCache()
	cache.Replace(map[string]struct{}{token: {}})
	bus := pins.DefaultBus()
	cmds := pins.NewCommandBus(16)
	stop := make(chan struct{})
	defer close(stop)
	go ServeForever(db, bus, cmds, 19884, cache, 2*time.Second, stop)
	time.Sleep(700 * time.Millisecond)

	ok, err := net.DialTimeout("tcp", "127.0.0.1:19884", 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer ok.Close()
	if _, err := ok.Write(mqttConnect("dev1", token, token)); err != nil {
		t.Fatal(err)
	}
	if connack := readExact(t, ok, 4, "connack"); string(connack) != string([]byte{0x20, 0x02, 0x00, 0x00}) {
		t.Fatalf("connack=%v", connack)
	}
	if _, err := ok.Write(mqttPublish("volta/dev/d1/state/V0", []byte("1"))); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "state tidak menandai online", func() bool {
		s, _ := db.GetStatus("d1")
		return s != nil && s.Online == 1
	})
	deadline := time.Now().Add(20 * time.Second)
	off := false
	for time.Now().Before(deadline) {
		if s, _ := db.GetStatus("d1"); s != nil && s.Online == 0 {
			off = true
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if !off {
		t.Fatal("perangkat diam tidak ditandai offline")
	}
}

var _ = fmt.Sprint
