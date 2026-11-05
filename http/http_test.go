package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"volta/mailer"
	"volta/pins"
	"volta/storage"
)

func testApp(t *testing.T) (*httptest.Server, *AppState) {
	t.Helper()
	db, err := storage.NewSqliteStorage(t.TempDir()+"/t.db", 5000)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	state := NewAppState(db, mailer.DefaultMailerConfig())
	srv := httptest.NewServer(Router(state))
	t.Cleanup(srv.Close)
	return srv, state
}

func req(t *testing.T, srv *httptest.Server, method, uri, token string, body any) (int, []byte) {
	t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = strings.NewReader(string(b))
	}
	r, err := http.NewRequest(method, srv.URL+uri, rd)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, b
}

func obj(t *testing.T, b []byte) map[string]any {
	t.Helper()
	var v map[string]any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("not an object: %s (%s)", b, err)
	}
	return v
}

func arr(t *testing.T, b []byte) []any {
	t.Helper()
	var v []any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("not an array: %s (%s)", b, err)
	}
	return v
}

func authed(t *testing.T, srv *httptest.Server, email string) string {
	t.Helper()
	if st, _ := req(t, srv, "POST", "/auth/register", "", map[string]string{"email": email, "password": "password123"}); st != http.StatusCreated {
		t.Fatalf("register %s: %d", email, st)
	}
	st, b := req(t, srv, "POST", "/auth/login", "", map[string]string{"email": email, "password": "password123"})
	if st != http.StatusOK {
		t.Fatalf("login: %d", st)
	}
	tok, _ := obj(t, b)["token"].(string)
	if tok == "" {
		t.Fatal("no token")
	}
	return tok
}

func TestRegisterLoginAndHealth(t *testing.T) {
	srv, _ := testApp(t)
	if st, _ := req(t, srv, "POST", "/auth/register", "", map[string]string{"email": "t@x.co", "password": "password123"}); st != http.StatusCreated {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/healthz", "", nil); st != http.StatusOK {
		t.Fatalf("st=%d", st)
	}
}

func TestErrorShapeIsConsistent(t *testing.T) {
	srv, _ := testApp(t)
	st, b := req(t, srv, "GET", "/devices", "", nil)
	if st != http.StatusUnauthorized {
		t.Fatalf("st=%d", st)
	}
	e, _ := obj(t, b)["error"].(map[string]any)
	if e == nil || e["code"] == nil || e["message"] == nil {
		t.Fatalf("shape=%s", b)
	}
}

func TestFaviconServed(t *testing.T) {
	srv, _ := testApp(t)
	resp, err := http.Get(srv.URL + "/favicon.ico")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "image/x-icon" {
		t.Fatalf("%d %q", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
}

func TestIndexServesJSON(t *testing.T) {
	srv, _ := testApp(t)
	resp, err := http.Get(srv.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(b), "VOLTA.") {
		t.Fatalf("body=%s", b)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("ct=%s", ct)
	}
}

func TestActorRejectsMissingOrInvalidCredentials(t *testing.T) {
	srv, _ := testApp(t)
	if st, _ := req(t, srv, "GET", "/devices/x/pins", "", nil); st != http.StatusUnauthorized {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/x/pins", "ngawur", nil); st != http.StatusUnauthorized {
		t.Fatalf("st=%d", st)
	}
	resp, err := http.Get(srv.URL + "/devices/x/pins?token=ngawur")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("st=%d", resp.StatusCode)
	}
}

func TestWidgetCRUDEnforcesOwnership(t *testing.T) {
	srv, _ := testApp(t)
	t1 := authed(t, srv, "w1@x.co")
	t2 := authed(t, srv, "w2@x.co")
	st, b := req(t, srv, "POST", "/dashboards", t1, map[string]string{"name": "d1"})
	if st != 201 {
		t.Fatalf("st=%d", st)
	}
	did := obj(t, b)["id"].(string)

	st, b = req(t, srv, "POST", "/dashboards/"+did+"/widgets", t1, map[string]string{"kind": "Gauge", "pin": "V0", "config": "{}"})
	if st != 201 {
		t.Fatalf("st=%d", st)
	}
	wid := obj(t, b)["id"].(string)

	if st, _ := req(t, srv, "GET", "/dashboards/"+did+"/widgets", t2, nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "PUT", fmt.Sprintf("/dashboards/%s/widgets/%s", did, wid), t2, map[string]string{"pin": "V1"}); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "DELETE", fmt.Sprintf("/dashboards/%s/widgets/%s", did, wid), t2, nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "PUT", fmt.Sprintf("/dashboards/%s/widgets/%s", did, wid), t1, map[string]string{"pin": "V1", "config": `{"max":100}`}); st != 200 {
		t.Fatalf("st=%d", st)
	}
	st, b = req(t, srv, "GET", "/dashboards/"+did+"/widgets", t1, nil)
	if st != 200 {
		t.Fatalf("st=%d", st)
	}
	items := arr(t, b)
	if len(items) != 1 || items[0].(map[string]any)["pin"] != "V1" || items[0].(map[string]any)["kind"] != "Gauge" {
		t.Fatalf("list=%s", b)
	}
	if st, _ := req(t, srv, "DELETE", fmt.Sprintf("/dashboards/%s/widgets/%s", did, wid), t1, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
	st, b = req(t, srv, "GET", "/dashboards/"+did+"/widgets", t1, nil)
	if st != 200 {
		t.Fatalf("st=%d", st)
	}
	if items := arr(t, b); len(items) != 0 {
		t.Fatalf("list=%s", b)
	}
}

func TestShareTokenOpensBoardScopedToItsDevices(t *testing.T) {
	srv, _ := testApp(t)
	t1 := authed(t, srv, "s1@x.co")
	t2 := authed(t, srv, "s2@x.co")
	_, b := req(t, srv, "POST", "/devices", t1, map[string]string{"name": "d1"})
	dev := obj(t, b)["device_id"].(string)
	_, b = req(t, srv, "POST", "/devices", t1, map[string]string{"name": "d2"})
	dev2 := obj(t, b)["device_id"].(string)
	_, b = req(t, srv, "POST", "/dashboards", t1, map[string]string{"name": "b1"})
	did := obj(t, b)["id"].(string)
	cfg := fmt.Sprintf(`{"device":%q}`, dev)
	if st, _ := req(t, srv, "POST", "/dashboards/"+did+"/widgets", t1, map[string]string{"kind": "gauge", "pin": "t1", "config": cfg}); st != 201 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "POST", "/dashboards/"+did+"/share", t2, nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	st, b := req(t, srv, "POST", "/dashboards/"+did+"/share", t1, nil)
	if st != 201 && st != 200 {
		t.Fatalf("st=%d", st)
	}
	tok := obj(t, b)["token"].(string)
	st, b = req(t, srv, "POST", "/dashboards/"+did+"/share", t1, nil)
	if st != 200 || obj(t, b)["token"] != tok {
		t.Fatalf("st=%d b=%s", st, b)
	}
	st, b = req(t, srv, "GET", "/dashboards/"+did+"/share", t1, nil)
	if st != 200 || obj(t, b)["token"] != tok {
		t.Fatalf("st=%d", st)
	}
	st, b = req(t, srv, "GET", "/share/"+tok, "", nil)
	if st != 200 {
		t.Fatalf("st=%d", st)
	}
	pb := obj(t, b)
	if pb["dashboard"].(map[string]any)["id"] != did {
		t.Fatalf("pb=%s", b)
	}
	if _, hasUser := pb["dashboard"].(map[string]any)["user_id"]; hasUser {
		t.Fatal("user_id leaked")
	}
	if len(pb["widgets"].([]any)) != 1 || len(pb["devices"].([]any)) != 1 {
		t.Fatalf("pb=%s", b)
	}
	if pb["devices"].([]any)[0].(map[string]any)["id"] != dev {
		t.Fatalf("pb=%s", b)
	}
	if st, b := req(t, srv, "GET", "/devices/"+dev+"/pins", tok, nil); st != 200 || len(arr(t, b)) != 0 {
		t.Fatalf("st=%d b=%s", st, b)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+dev+"/status", tok, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+dev+"/history/t1?from=0&to=9999999999", tok, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+dev2+"/pins", tok, nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+dev+"/pins", "ngawur", nil); st != 401 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/share/ngawur", "", nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "DELETE", "/dashboards/"+did+"/share", t1, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/share/"+tok, "", nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+dev+"/pins", tok, nil); st != 401 {
		t.Fatalf("st=%d", st)
	}
}

func TestDashboardUpdateDeleteEnforceOwnership(t *testing.T) {
	srv, _ := testApp(t)
	t1 := authed(t, srv, "o1@x.co")
	t2 := authed(t, srv, "o2@x.co")
	_, b := req(t, srv, "POST", "/dashboards", t1, map[string]string{"name": "d1"})
	did := obj(t, b)["id"].(string)
	if st, _ := req(t, srv, "PUT", "/dashboards/"+did, t2, map[string]string{"name": "x"}); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "DELETE", "/dashboards/"+did, t2, nil); st != 404 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "PUT", "/dashboards/"+did, t1, map[string]string{"name": "baru"}); st != 200 {
		t.Fatalf("st=%d", st)
	}
}

func TestWidgetConfigMustBeJSONAndCapped(t *testing.T) {
	srv, _ := testApp(t)
	tok := authed(t, srv, "v@x.co")
	_, b := req(t, srv, "POST", "/dashboards", tok, map[string]string{"name": "d1"})
	did := obj(t, b)["id"].(string)
	url := "/dashboards/" + did + "/widgets"
	if st, _ := req(t, srv, "POST", url, tok, map[string]string{"kind": "Gauge", "pin": "V0", "config": "bukan-json"}); st != 400 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "POST", url, tok, map[string]string{"kind": "html", "pin": "", "config": strings.Repeat("x", 65537)}); st != 400 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "POST", url, tok, map[string]string{"kind": "html", "pin": "", "config": `{"a":1}`}); st != 201 {
		t.Fatalf("st=%d", st)
	}
}

func TestDeviceStatusReportsOfflineByDefault(t *testing.T) {
	srv, _ := testApp(t)
	tok := authed(t, srv, "s@x.co")
	_, b := req(t, srv, "POST", "/devices", tok, map[string]string{"name": "d1"})
	id := obj(t, b)["device_id"].(string)
	st, b := req(t, srv, "GET", "/devices/"+id+"/status", tok, nil)
	if st != 200 {
		t.Fatalf("st=%d", st)
	}
	if obj(t, b)["online"] != false {
		t.Fatalf("v=%s", b)
	}
}

func TestOtaStartStop(t *testing.T) {
	srv, _ := testApp(t)
	tok := authed(t, srv, "ota@x.co")
	_, b := req(t, srv, "POST", "/devices", tok, map[string]string{"name": "d1"})
	id := obj(t, b)["device_id"].(string)
	st, b := req(t, srv, "POST", "/devices/"+id+"/ota/start", tok, map[string]string{"url": "http://x/f.bin", "version": "9"})
	if st != 200 || obj(t, b)["version"] != "9" {
		t.Fatalf("st=%d v=%s", st, b)
	}
	if st, _ := req(t, srv, "POST", "/devices/"+id+"/ota/stop", tok, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
}

func TestAdminStatsRequiresAuth(t *testing.T) {
	srv, _ := testApp(t)
	if st, _ := req(t, srv, "GET", "/admin/stats", "", nil); st != 401 {
		t.Fatalf("st=%d", st)
	}
	tok := authed(t, srv, "a@x.co")
	st, b := req(t, srv, "GET", "/admin/stats", tok, nil)
	if st != 200 || obj(t, b)["uptime_secs"] == nil {
		t.Fatalf("st=%d v=%s", st, b)
	}
}

func TestPutPinAndHistory(t *testing.T) {
	srv, _ := testApp(t)
	tok := authed(t, srv, "p@x.co")
	_, b := req(t, srv, "POST", "/devices", tok, map[string]string{"name": "d1"})
	id := obj(t, b)["device_id"].(string)
	if st, _ := req(t, srv, "PUT", "/devices/"+id+"/pins/V0", tok, map[string]string{"value": "1"}); st != 200 {
		t.Fatalf("st=%d", st)
	}
	if st, _ := req(t, srv, "GET", "/devices/"+id+"/history/V0", tok, nil); st != 200 {
		t.Fatalf("st=%d", st)
	}
}

func TestStreamDeliversPinEvents(t *testing.T) {
	srv, state := testApp(t)
	tok := authed(t, srv, "ws@x.co")
	_, b := req(t, srv, "POST", "/devices", tok, map[string]string{"name": "d1"})
	id := obj(t, b)["device_id"].(string)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/devices/" + id + "/stream"
	dialer := websocket.Dialer{HandshakeTimeout: 5 * time.Second}
	hdr := http.Header{"Authorization": []string{"Bearer " + tok}}
	conn, _, err := dialer.Dial(wsURL, hdr)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	_, first, err := conn.ReadMessage()
	if err != nil || string(first) != "connected "+id {
		t.Fatalf("first=%q err=%v", first, err)
	}
	state.Bus.Publish(pins.PinEvent{DeviceID: id, Pin: "V0", Value: "7"})
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	_, line, err := conn.ReadMessage()
	if err != nil {
		t.Fatal(err)
	}
	var ev map[string]string
	if err := json.Unmarshal(line, &ev); err != nil || ev["pin"] != "V0" || ev["value"] != "7" {
		t.Fatalf("line=%s err=%v", line, err)
	}
}
