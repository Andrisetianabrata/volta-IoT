package http

import (
	"embed"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"volta/auth"
	"volta/logo"
	"volta/mailer"
	"volta/ota"
	"volta/pins"
	"volta/stats"
	"volta/storage"
)

//go:embed assets/favicon.ico assets/volta-horizontal-reversed.svg
var assetsFS embed.FS

type AppState struct {
	DB        storage.Storage
	Bus       *pins.PinBus
	Cmds      *pins.CommandBus
	Stats     *stats.Stats
	Mailer    *mailer.Mailer
	MailerCfg mailer.MailerConfig
	Ota       *ota.Manager
}

func NewAppState(db storage.Storage, mailerCfg mailer.MailerConfig) *AppState {
	m, _ := mailer.New(mailerCfg)
	return &AppState{
		DB:        db,
		Bus:       pins.DefaultBus(),
		Cmds:      pins.NewCommandBus(1024),
		Stats:     stats.New(),
		Mailer:    m,
		MailerCfg: mailerCfg,
		Ota:       ota.NewManager(),
	}
}

func bearer(r *http.Request) (string, error) {
	v := r.Header.Get("Authorization")
	if v == "" {
		return "", Unauthorized("missing bearer")
	}
	t, ok := strings.CutPrefix(v, "Bearer ")
	if !ok {
		return "", Unauthorized("bad scheme")
	}
	return t, nil
}

func userID(s *AppState, r *http.Request) (string, error) {
	tok, err := bearer(r)
	if err != nil {
		return "", err
	}
	return auth.UserIDForSession(s.DB, tok)
}

type ShareScope struct {
	DashboardID string
	Devices     []string
}

func shareScope(db storage.Storage, token string) (ShareScope, error) {
	sh, err := db.GetShare(token)
	if err != nil || sh == nil {
		return ShareScope{}, NotFound("tautan tidak valid")
	}
	widgets, err := db.ListWidgets(sh.DashboardID)
	if err != nil {
		return ShareScope{}, NotFound("tautan tidak valid")
	}
	scope := ShareScope{DashboardID: sh.DashboardID}
	for _, w := range widgets {
		var cfg map[string]any
		if err := json.Unmarshal([]byte(w.Config), &cfg); err != nil {
			continue
		}
		if d, ok := cfg["device"].(string); ok && d != "" {
			found := false
			for _, x := range scope.Devices {
				if x == d {
					found = true
					break
				}
			}
			if !found {
				scope.Devices = append(scope.Devices, d)
			}
		}
	}
	return scope, nil
}

type actorKind int

const (
	actorUser actorKind = iota
	actorShare
)

type actor struct {
	kind  actorKind
	user  string
	scope ShareScope
}

func resolveActor(s *AppState, r *http.Request) (actor, error) {
	if tok, err := bearer(r); err == nil {
		if u, err := auth.UserIDForSession(s.DB, tok); err == nil {
			return actor{kind: actorUser, user: u}, nil
		}
		if scope, err := shareScope(s.DB, tok); err == nil {
			return actor{kind: actorShare, scope: scope}, nil
		}
		return actor{}, Unauthorized("invalid session")
	}
	if t := r.URL.Query().Get("token"); t != "" {
		if scope, err := shareScope(s.DB, t); err == nil {
			return actor{kind: actorShare, scope: scope}, nil
		}
		return actor{}, Unauthorized("invalid session")
	}
	return actor{}, Unauthorized("missing bearer")
}

func checkDevice(s *AppState, a actor, id string) error {
	dev, err := s.DB.GetDevice(id)
	if err != nil {
		return err
	}
	if dev == nil {
		return NotFound("device tidak ada")
	}
	switch a.kind {
	case actorUser:
		if dev.UserID != a.user {
			return NotFound("device tidak ada")
		}
	case actorShare:
		for _, d := range a.scope.Devices {
			if d == id {
				return nil
			}
		}
		return NotFound("device tidak ada")
	}
	return nil
}

func ownedDashboard(db storage.Storage, userID, dashboardID string) (*storage.Dashboard, error) {
	d, err := db.GetDashboard(dashboardID)
	if err != nil {
		return nil, err
	}
	if d == nil || d.UserID != userID {
		return nil, NotFound("dashboard tidak ada")
	}
	return d, nil
}

const maxWidgetConfigLen = 65536

func checkWidgetConfig(config string) error {
	if len(config) > maxWidgetConfigLen {
		return BadRequest("CONFIG_TOO_LARGE", "config melebihi 64 KB")
	}
	var v any
	if err := json.Unmarshal([]byte(config), &v); err != nil {
		return BadRequest("INVALID_CONFIG", "config harus JSON valid")
	}
	return nil
}

func handleRegister(s *AppState, w http.ResponseWriter, r *http.Request) {
	var b struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	id, err := auth.Register(s.DB, b.Email, b.Password)
	if err != nil {
		switch err {
		case auth.ErrExists:
			writeError(w, NewApiError(http.StatusConflict, "EXISTS", err.Error()))
		default:
			writeError(w, BadRequest("INVALID", err.Error()))
		}
		return
	}
	subj, body := mailer.RenderRegister("VOLTA.", id)
	_, _ = s.DB.EnqueueMail(b.Email, subj, body, storage.NowUnix())
	writeJSON(w, http.StatusCreated, map[string]string{"user_id": id})
}

func handleLogin(s *AppState, w http.ResponseWriter, r *http.Request) {
	var b struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	t, err := auth.Login(s.DB, b.Email, b.Password)
	if err != nil {
		writeError(w, Unauthorized("kredensial salah"))
		return
	}
	s.Stats.IncLogins()
	writeJSON(w, http.StatusOK, map[string]string{"token": t})
}

func handleListDashboards(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	list, err := s.DB.ListDashboards(u)
	if err != nil {
		writeError(w, err)
		return
	}
	if list == nil {
		list = []storage.Dashboard{}
	}
	writeJSON(w, http.StatusOK, list)
}

func handleCreateDashboard(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	var b struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	id := uuid.NewString()
	if err := s.DB.CreateDashboard(id, u, b.Name, storage.NowUnix()); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func handleUpdateDashboard(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	var b struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	if err := s.DB.UpdateDashboard(id, b.Name); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleDeleteDashboard(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	_ = s.DB.DeleteShareByDashboard(id)
	if err := s.DB.DeleteDashboard(id); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleListDevices(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	list, err := s.DB.ListDevices(u)
	if err != nil {
		writeError(w, err)
		return
	}
	if list == nil {
		list = []storage.Device{}
	}
	writeJSON(w, http.StatusOK, list)
}

func handleCreateDevice(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	var b struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	id, token, err := auth.CreateDeviceWithToken(s.DB, u, b.Name)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"device_id": id, "token": token})
}

func handleDeleteDevice(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	dev, err := s.DB.GetDevice(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if dev == nil || dev.UserID != u {
		writeError(w, NotFound("device tidak ada"))
		return
	}
	if err := s.DB.DeleteDevice(id); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleListPins(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	list, err := s.DB.ListPins(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if list == nil {
		list = []storage.PinState{}
	}
	writeJSON(w, http.StatusOK, list)
}

func handleGetPin(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	pin := r.PathValue("pin")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	p, err := s.DB.GetPin(id, pin)
	if err != nil {
		writeError(w, err)
		return
	}
	if p == nil {
		writeError(w, NotFound("pin tidak ada"))
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func handlePutPin(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	pin := r.PathValue("pin")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	var b struct {
		Value string `json:"value"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	if err := s.Cmds.Send(pins.CmdRequest{DeviceID: id, Pin: pin, Value: b.Value}, 2*time.Second); err != nil {
		writeError(w, BadRequest("CMD_TIMEOUT", err.Error()))
		return
	}
	s.Stats.IncCmds()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleHistory(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	pin := r.PathValue("pin")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	q := r.URL.Query()
	from := parseI64(q.Get("from"), 0)
	to := parseI64(q.Get("to"), math.MaxInt64)
	limit := parseI64(q.Get("limit"), 500)
	if limit > 5000 {
		limit = 5000
	}
	rows, err := s.DB.QueryHistory(id, pin, from, to, limit)
	if err != nil {
		writeError(w, err)
		return
	}
	if rows == nil {
		rows = []storage.PinHistory{}
	}
	writeJSON(w, http.StatusOK, rows)
}

func parseI64(s string, def int64) int64 {
	if s == "" {
		return def
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return def
	}
	return n
}

var wsUpgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func handleStream(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	_ = conn.WriteMessage(websocket.TextMessage, []byte("connected "+id))
	ch, unsub := s.Bus.Subscribe()
	defer unsub()
	for ev := range ch {
		if ev.DeviceID != id {
			continue
		}
		line, _ := json.Marshal(map[string]string{"pin": ev.Pin, "value": ev.Value})
		if err := conn.WriteMessage(websocket.TextMessage, line); err != nil {
			return
		}
	}
}

func handleHealthz(s *AppState, w http.ResponseWriter, r *http.Request) {
	mailOK := false
	if s.Mailer != nil {
		mailOK = s.Mailer.TestConnection()
	}
	pending, err := s.DB.MailPendingCount()
	if err != nil {
		pending = -1
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"broker": map[string]any{"local_port": 1883, "tls_port": 8883},
		"db":     map[string]any{"ok": true},
		"mailer": map[string]any{"ok": mailOK, "pending": pending},
		"stats":  s.Stats.Snapshot(),
	})
}

func handleAdminStats(s *AppState, w http.ResponseWriter, r *http.Request) {
	if _, err := userID(s, r); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s.Stats.Snapshot())
}

func handleListWidgets(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	list, err := s.DB.ListWidgets(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if list == nil {
		list = []storage.Widget{}
	}
	writeJSON(w, http.StatusOK, list)
}

func handleCreateWidget(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	var b struct {
		Kind   string  `json:"kind"`
		Pin    string  `json:"pin"`
		Config *string `json:"config"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	cfg := "{}"
	if b.Config != nil {
		cfg = *b.Config
	}
	if err := checkWidgetConfig(cfg); err != nil {
		writeError(w, err)
		return
	}
	wid := uuid.NewString()
	if err := s.DB.CreateWidget(wid, id, b.Kind, b.Pin, cfg); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": wid})
}

func handleUpdateWidget(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	wid := r.PathValue("wid")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	existing, err := s.DB.GetWidget(wid)
	if err != nil {
		writeError(w, err)
		return
	}
	if existing == nil || existing.DashboardID != id {
		writeError(w, NotFound("widget tidak ada"))
		return
	}
	var b struct {
		Kind   *string `json:"kind"`
		Pin    *string `json:"pin"`
		Config *string `json:"config"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	kind := existing.Kind
	if b.Kind != nil {
		kind = *b.Kind
	}
	pin := existing.Pin
	if b.Pin != nil {
		pin = *b.Pin
	}
	cfg := existing.Config
	if b.Config != nil {
		cfg = *b.Config
	}
	if err := checkWidgetConfig(cfg); err != nil {
		writeError(w, err)
		return
	}
	if err := s.DB.UpdateWidget(wid, kind, pin, cfg); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleDeleteWidget(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	wid := r.PathValue("wid")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	existing, err := s.DB.GetWidget(wid)
	if err != nil {
		writeError(w, err)
		return
	}
	if existing == nil || existing.DashboardID != id {
		writeError(w, NotFound("widget tidak ada"))
		return
	}
	if err := s.DB.DeleteWidget(wid); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleCreateShare(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	if existing, err := s.DB.GetShareByDashboard(id); err != nil {
		writeError(w, err)
		return
	} else if existing != nil {
		writeJSON(w, http.StatusOK, map[string]string{"token": existing.Token})
		return
	}
	token := strings.ReplaceAll(uuid.NewString(), "-", "")
	if err := s.DB.CreateShare(token, id, storage.NowUnix()); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"token": token})
}

func handleGetShareState(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	sh, err := s.DB.GetShareByDashboard(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if sh == nil {
		writeError(w, NotFound("belum dibagikan"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": sh.Token})
}

func handleDeleteShare(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if _, err := ownedDashboard(s.DB, u, id); err != nil {
		writeError(w, err)
		return
	}
	if err := s.DB.DeleteShareByDashboard(id); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handlePublicBoard(s *AppState, w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	scope, err := shareScope(s.DB, token)
	if err != nil {
		writeError(w, err)
		return
	}
	dash, err := s.DB.GetDashboard(scope.DashboardID)
	if err != nil {
		writeError(w, err)
		return
	}
	if dash == nil {
		writeError(w, NotFound("tautan tidak valid"))
		return
	}
	widgets, err := s.DB.ListWidgets(scope.DashboardID)
	if err != nil {
		writeError(w, err)
		return
	}
	if widgets == nil {
		widgets = []storage.Widget{}
	}
	devices := []map[string]string{}
	for _, d := range scope.Devices {
		if dev, err := s.DB.GetDevice(d); err == nil && dev != nil {
			devices = append(devices, map[string]string{"id": dev.ID, "name": dev.Name})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"dashboard": map[string]string{"id": dash.ID, "name": dash.Name},
		"widgets":   widgets,
		"devices":   devices,
	})
}

func handleOtaStart(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	dev, err := s.DB.GetDevice(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if dev == nil || dev.UserID != u {
		writeError(w, NotFound("device tidak ada"))
		return
	}
	var b struct {
		URL     string `json:"url"`
		Version string `json:"version"`
	}
	if err := decodeJSON(r, &b); err != nil {
		writeError(w, BadRequest("INVALID", "body tidak valid"))
		return
	}
	job := s.Ota.Start(id, b.URL, b.Version)
	payload := ota.CmdPayload(job)
	if err := s.Cmds.Send(pins.CmdRequest{DeviceID: id, Pin: "ota", Value: payload}, 2*time.Second); err != nil {
		writeError(w, BadRequest("CMD_TIMEOUT", err.Error()))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "version": job.Version})
}

func handleOtaStop(s *AppState, w http.ResponseWriter, r *http.Request) {
	u, err := userID(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	dev, err := s.DB.GetDevice(id)
	if err != nil {
		writeError(w, err)
		return
	}
	if dev == nil || dev.UserID != u {
		writeError(w, NotFound("device tidak ada"))
		return
	}
	s.Ota.Stop(id)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleDeviceStatus(s *AppState, w http.ResponseWriter, r *http.Request) {
	a, err := resolveActor(s, r)
	if err != nil {
		writeError(w, err)
		return
	}
	id := r.PathValue("id")
	if err := checkDevice(s, a, id); err != nil {
		writeError(w, err)
		return
	}
	st, err := s.DB.GetStatus(id)
	if err != nil {
		writeError(w, err)
		return
	}
	online := false
	var updatedAt *int64
	if st != nil {
		online = st.Online != 0
		updatedAt = &st.UpdatedAt
	}
	writeJSON(w, http.StatusOK, map[string]any{"online": online, "updated_at": updatedAt})
}

func handleIndex(s *AppState, w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"name": "VOLTA.", "version": logo.Version})
}

func handleFavicon(w http.ResponseWriter, r *http.Request) {
	b, err := assetsFS.ReadFile("assets/favicon.ico")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "image/x-icon")
	_, _ = w.Write(b)
}

func handleLogoSVG(w http.ResponseWriter, r *http.Request) {
	b, err := assetsFS.ReadFile("assets/volta-horizontal-reversed.svg")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "image/svg+xml")
	_, _ = w.Write(b)
}

func Router(s *AppState) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			writeError(w, NotFound("tidak ada"))
			return
		}
		handleIndex(s, w, r)
	})
	mux.HandleFunc("POST /auth/register", func(w http.ResponseWriter, r *http.Request) { handleRegister(s, w, r) })
	mux.HandleFunc("POST /auth/login", func(w http.ResponseWriter, r *http.Request) { handleLogin(s, w, r) })
	mux.HandleFunc("GET /dashboards", func(w http.ResponseWriter, r *http.Request) { handleListDashboards(s, w, r) })
	mux.HandleFunc("POST /dashboards", func(w http.ResponseWriter, r *http.Request) { handleCreateDashboard(s, w, r) })
	mux.HandleFunc("PUT /dashboards/{id}", func(w http.ResponseWriter, r *http.Request) { handleUpdateDashboard(s, w, r) })
	mux.HandleFunc("DELETE /dashboards/{id}", func(w http.ResponseWriter, r *http.Request) { handleDeleteDashboard(s, w, r) })
	mux.HandleFunc("GET /dashboards/{id}/widgets", func(w http.ResponseWriter, r *http.Request) { handleListWidgets(s, w, r) })
	mux.HandleFunc("POST /dashboards/{id}/widgets", func(w http.ResponseWriter, r *http.Request) { handleCreateWidget(s, w, r) })
	mux.HandleFunc("PUT /dashboards/{id}/widgets/{wid}", func(w http.ResponseWriter, r *http.Request) { handleUpdateWidget(s, w, r) })
	mux.HandleFunc("DELETE /dashboards/{id}/widgets/{wid}", func(w http.ResponseWriter, r *http.Request) { handleDeleteWidget(s, w, r) })
	mux.HandleFunc("POST /dashboards/{id}/share", func(w http.ResponseWriter, r *http.Request) { handleCreateShare(s, w, r) })
	mux.HandleFunc("GET /dashboards/{id}/share", func(w http.ResponseWriter, r *http.Request) { handleGetShareState(s, w, r) })
	mux.HandleFunc("DELETE /dashboards/{id}/share", func(w http.ResponseWriter, r *http.Request) { handleDeleteShare(s, w, r) })
	mux.HandleFunc("GET /share/{token}", func(w http.ResponseWriter, r *http.Request) { handlePublicBoard(s, w, r) })
	mux.HandleFunc("GET /devices", func(w http.ResponseWriter, r *http.Request) { handleListDevices(s, w, r) })
	mux.HandleFunc("POST /devices", func(w http.ResponseWriter, r *http.Request) { handleCreateDevice(s, w, r) })
	mux.HandleFunc("DELETE /devices/{id}", func(w http.ResponseWriter, r *http.Request) { handleDeleteDevice(s, w, r) })
	mux.HandleFunc("GET /devices/{id}/status", func(w http.ResponseWriter, r *http.Request) { handleDeviceStatus(s, w, r) })
	mux.HandleFunc("GET /devices/{id}/pins", func(w http.ResponseWriter, r *http.Request) { handleListPins(s, w, r) })
	mux.HandleFunc("GET /devices/{id}/pins/{pin}", func(w http.ResponseWriter, r *http.Request) { handleGetPin(s, w, r) })
	mux.HandleFunc("PUT /devices/{id}/pins/{pin}", func(w http.ResponseWriter, r *http.Request) { handlePutPin(s, w, r) })
	mux.HandleFunc("GET /devices/{id}/history/{pin}", func(w http.ResponseWriter, r *http.Request) { handleHistory(s, w, r) })
	mux.HandleFunc("GET /devices/{id}/stream", func(w http.ResponseWriter, r *http.Request) { handleStream(s, w, r) })
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { handleHealthz(s, w, r) })
	mux.HandleFunc("GET /admin/stats", func(w http.ResponseWriter, r *http.Request) { handleAdminStats(s, w, r) })
	mux.HandleFunc("POST /devices/{id}/ota/start", func(w http.ResponseWriter, r *http.Request) { handleOtaStart(s, w, r) })
	mux.HandleFunc("POST /devices/{id}/ota/stop", func(w http.ResponseWriter, r *http.Request) { handleOtaStop(s, w, r) })
	mux.HandleFunc("GET /favicon.ico", handleFavicon)
	mux.HandleFunc("GET /logo-horizontal.svg", handleLogoSVG)
	return mux
}
