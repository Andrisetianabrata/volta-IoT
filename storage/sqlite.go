package storage

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

type SqliteStorage struct {
	db *sql.DB
}

func boolInt(b bool) int64 {
	if b {
		return 1
	}
	return 0
}

func NewSqliteStorage(dbPath string, busyTimeoutMs uint64) (*SqliteStorage, error) {
	var dsn string
	if dbPath == ":memory:" {
		dsn = fmt.Sprintf("file::memory:?cache=shared&_busy_timeout=%d&_foreign_keys=on", busyTimeoutMs)
	} else {
		dsn = fmt.Sprintf("file:%s?cache=shared&_journal_mode=WAL&_busy_timeout=%d&_foreign_keys=on", dbPath, busyTimeoutMs)
	}
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, err
	}
	if _, err := db.Exec(fmt.Sprintf("PRAGMA busy_timeout=%d", busyTimeoutMs)); err != nil {
		db.Close()
		return nil, err
	}
	s := &SqliteStorage{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *SqliteStorage) migrate() error {
	for _, name := range MigrationSQL() {
		content, err := MigrationContent(name)
		if err != nil {
			return err
		}
		for _, stmt := range strings.Split(content, ";") {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := s.db.Exec(stmt); err != nil {
				return fmt.Errorf("migrate %s: %w", name, err)
			}
		}
	}
	return nil
}

func (s *SqliteStorage) Close() error { return s.db.Close() }

func (s *SqliteStorage) CreateUser(id, email, passHash string, now int64) error {
	_, err := s.db.Exec("INSERT INTO users(id,email,pass_hash,created_at) VALUES(?,?,?,?)", id, email, passHash, now)
	return err
}

func (s *SqliteStorage) GetUserByEmail(email string) (*User, error) {
	var u User
	err := s.db.QueryRow("SELECT id,email,pass_hash,created_at FROM users WHERE email=?", email).Scan(&u.ID, &u.Email, &u.PassHash, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *SqliteStorage) CreateSession(id, userID string, now, expires int64) error {
	_, err := s.db.Exec("INSERT INTO sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)", id, userID, now, expires)
	return err
}

func (s *SqliteStorage) GetSession(id string) (*Session, error) {
	var x Session
	err := s.db.QueryRow("SELECT id,user_id,created_at,expires_at FROM sessions WHERE id=?", id).Scan(&x.ID, &x.UserID, &x.CreatedAt, &x.ExpiresAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (s *SqliteStorage) DeleteSession(id string) error {
	_, err := s.db.Exec("DELETE FROM sessions WHERE id=?", id)
	return err
}

func (s *SqliteStorage) CreateDevice(id, userID, name string, now int64) error {
	_, err := s.db.Exec("INSERT INTO devices(id,user_id,name,created_at) VALUES(?,?,?,?)", id, userID, name, now)
	return err
}

func (s *SqliteStorage) ListDevices(userID string) ([]Device, error) {
	rows, err := s.db.Query("SELECT id,user_id,name,created_at FROM devices WHERE user_id=?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Device{}
	for rows.Next() {
		var d Device
		if err := rows.Scan(&d.ID, &d.UserID, &d.Name, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) GetDevice(id string) (*Device, error) {
	var d Device
	err := s.db.QueryRow("SELECT id,user_id,name,created_at FROM devices WHERE id=?", id).Scan(&d.ID, &d.UserID, &d.Name, &d.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *SqliteStorage) DeleteDevice(id string) error {
	_, err := s.db.Exec("DELETE FROM devices WHERE id=?", id)
	return err
}

func (s *SqliteStorage) IssueToken(token, deviceID string, now int64) error {
	_, err := s.db.Exec("INSERT INTO device_tokens(token,device_id,revoked,created_at) VALUES(?,?,0,?)", token, deviceID, now)
	return err
}

func (s *SqliteStorage) LookupToken(token string) (*DeviceToken, error) {
	var t DeviceToken
	err := s.db.QueryRow("SELECT token,device_id,revoked,created_at FROM device_tokens WHERE token=?", token).Scan(&t.Token, &t.DeviceID, &t.Revoked, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *SqliteStorage) RevokeToken(token string) error {
	_, err := s.db.Exec("UPDATE device_tokens SET revoked=1 WHERE token=?", token)
	return err
}

func (s *SqliteStorage) ListValidTokens() ([]string, error) {
	rows, err := s.db.Query("SELECT token FROM device_tokens WHERE revoked=0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) ListOnlineDeviceIDs() ([]string, error) {
	rows, err := s.db.Query("SELECT device_id FROM device_status WHERE online!=0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) UpsertPin(deviceID, pin, value string, now int64) error {
	_, err := s.db.Exec("INSERT INTO pin_state(device_id,pin,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(device_id,pin) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", deviceID, pin, value, now)
	return err
}

func (s *SqliteStorage) GetPin(deviceID, pin string) (*PinState, error) {
	var p PinState
	err := s.db.QueryRow("SELECT device_id,pin,value,updated_at FROM pin_state WHERE device_id=? AND pin=?", deviceID, pin).Scan(&p.DeviceID, &p.Pin, &p.Value, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *SqliteStorage) ListPins(deviceID string) ([]PinState, error) {
	rows, err := s.db.Query("SELECT device_id,pin,value,updated_at FROM pin_state WHERE device_id=?", deviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PinState{}
	for rows.Next() {
		var p PinState
		if err := rows.Scan(&p.DeviceID, &p.Pin, &p.Value, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) InsertHistory(deviceID, pin, value string, ts int64) error {
	_, err := s.db.Exec("INSERT INTO pin_history(device_id,pin,value,ts) VALUES(?,?,?,?)", deviceID, pin, value, ts)
	return err
}

func (s *SqliteStorage) QueryHistory(deviceID, pin string, from, to, limit int64) ([]PinHistory, error) {
	rows, err := s.db.Query("SELECT id,device_id,pin,value,ts FROM pin_history WHERE device_id=? AND pin=? AND ts>=? AND ts<=? ORDER BY ts ASC LIMIT ?", deviceID, pin, from, to, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PinHistory{}
	for rows.Next() {
		var h PinHistory
		if err := rows.Scan(&h.ID, &h.DeviceID, &h.Pin, &h.Value, &h.Ts); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) CreateDashboard(id, userID, name string, now int64) error {
	_, err := s.db.Exec("INSERT INTO dashboards(id,user_id,name,created_at) VALUES(?,?,?,?)", id, userID, name, now)
	return err
}

func (s *SqliteStorage) GetDashboard(id string) (*Dashboard, error) {
	var d Dashboard
	err := s.db.QueryRow("SELECT id,user_id,name,created_at FROM dashboards WHERE id=?", id).Scan(&d.ID, &d.UserID, &d.Name, &d.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *SqliteStorage) ListDashboards(userID string) ([]Dashboard, error) {
	rows, err := s.db.Query("SELECT id,user_id,name,created_at FROM dashboards WHERE user_id=?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Dashboard{}
	for rows.Next() {
		var d Dashboard
		if err := rows.Scan(&d.ID, &d.UserID, &d.Name, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) UpdateDashboard(id, name string) error {
	_, err := s.db.Exec("UPDATE dashboards SET name=? WHERE id=?", name, id)
	return err
}

func (s *SqliteStorage) DeleteDashboard(id string) error {
	_, err := s.db.Exec("DELETE FROM dashboards WHERE id=?", id)
	return err
}

func (s *SqliteStorage) CreateWidget(id, dashboardID, kind, pin, config string) error {
	_, err := s.db.Exec("INSERT INTO dashboard_widgets(id,dashboard_id,kind,pin,config) VALUES(?,?,?,?,?)", id, dashboardID, kind, pin, config)
	return err
}

func (s *SqliteStorage) GetWidget(id string) (*Widget, error) {
	var w Widget
	err := s.db.QueryRow("SELECT id,dashboard_id,kind,pin,config FROM dashboard_widgets WHERE id=?", id).Scan(&w.ID, &w.DashboardID, &w.Kind, &w.Pin, &w.Config)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (s *SqliteStorage) UpdateWidget(id, kind, pin, config string) error {
	_, err := s.db.Exec("UPDATE dashboard_widgets SET kind=?, pin=?, config=? WHERE id=?", kind, pin, config, id)
	return err
}

func (s *SqliteStorage) DeleteWidget(id string) error {
	_, err := s.db.Exec("DELETE FROM dashboard_widgets WHERE id=?", id)
	return err
}

func (s *SqliteStorage) ListWidgets(dashboardID string) ([]Widget, error) {
	rows, err := s.db.Query("SELECT id,dashboard_id,kind,pin,config FROM dashboard_widgets WHERE dashboard_id=?", dashboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Widget{}
	for rows.Next() {
		var w Widget
		if err := rows.Scan(&w.ID, &w.DashboardID, &w.Kind, &w.Pin, &w.Config); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) CreateShare(token, dashboardID string, now int64) error {
	_, err := s.db.Exec("INSERT INTO shares(token,dashboard_id,created_at) VALUES(?,?,?)", token, dashboardID, now)
	return err
}

func (s *SqliteStorage) GetShare(token string) (*Share, error) {
	var x Share
	err := s.db.QueryRow("SELECT token,dashboard_id,created_at FROM shares WHERE token=?", token).Scan(&x.Token, &x.DashboardID, &x.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (s *SqliteStorage) GetShareByDashboard(dashboardID string) (*Share, error) {
	var x Share
	err := s.db.QueryRow("SELECT token,dashboard_id,created_at FROM shares WHERE dashboard_id=?", dashboardID).Scan(&x.Token, &x.DashboardID, &x.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (s *SqliteStorage) DeleteShareByDashboard(dashboardID string) error {
	_, err := s.db.Exec("DELETE FROM shares WHERE dashboard_id=?", dashboardID)
	return err
}

func (s *SqliteStorage) EnqueueMail(to, subject, body string, now int64) (int64, error) {
	r, err := s.db.Exec("INSERT INTO mail_queue(to_addr,subject,body,attempts,next_try,status) VALUES(?,?,?,0,?,'pending')", to, subject, body, now)
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

func (s *SqliteStorage) ClaimMailBatch(limit, now int64) ([]MailItem, error) {
	rows, err := s.db.Query("SELECT id,to_addr,subject,body,attempts,next_try,status FROM mail_queue WHERE status='pending' AND next_try<=? ORDER BY id ASC LIMIT ?", now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MailItem{}
	for rows.Next() {
		var m MailItem
		if err := rows.Scan(&m.ID, &m.ToAddr, &m.Subject, &m.Body, &m.Attempts, &m.NextTry, &m.Status); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) MarkMailSent(id int64) error {
	_, err := s.db.Exec("UPDATE mail_queue SET status='sent' WHERE id=?", id)
	return err
}

func (s *SqliteStorage) MarkMailRetry(id, attempts, nextTry int64) error {
	_, err := s.db.Exec("UPDATE mail_queue SET attempts=?, next_try=? WHERE id=?", attempts, nextTry, id)
	return err
}

func (s *SqliteStorage) MailPendingCount() (int64, error) {
	var c int64
	err := s.db.QueryRow("SELECT COUNT(*) FROM mail_queue WHERE status='pending'").Scan(&c)
	return c, err
}

func (s *SqliteStorage) CreateRule(r Rule) error {
	_, err := s.db.Exec("INSERT INTO rules(id,user_id,device_id,pin,op,threshold,action,action_pin,action_value,enabled) VALUES(?,?,?,?,?,?,?,?,?,?)", r.ID, r.UserID, r.DeviceID, r.Pin, r.Op, r.Threshold, r.Action, r.ActionPin, r.ActionValue, r.Enabled)
	return err
}

func (s *SqliteStorage) ListRules(userID string) ([]Rule, error) {
	rows, err := s.db.Query("SELECT id,user_id,device_id,pin,op,threshold,action,action_pin,action_value,enabled FROM rules WHERE user_id=?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Rule{}
	for rows.Next() {
		var r Rule
		if err := rows.Scan(&r.ID, &r.UserID, &r.DeviceID, &r.Pin, &r.Op, &r.Threshold, &r.Action, &r.ActionPin, &r.ActionValue, &r.Enabled); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) ListRulesForPin(deviceID, pin string) ([]Rule, error) {
	rows, err := s.db.Query("SELECT id,user_id,device_id,pin,op,threshold,action,action_pin,action_value,enabled FROM rules WHERE device_id=? AND pin=? AND enabled=1", deviceID, pin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Rule{}
	for rows.Next() {
		var r Rule
		if err := rows.Scan(&r.ID, &r.UserID, &r.DeviceID, &r.Pin, &r.Op, &r.Threshold, &r.Action, &r.ActionPin, &r.ActionValue, &r.Enabled); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *SqliteStorage) SetStatus(deviceID string, online bool, now int64) error {
	_, err := s.db.Exec("INSERT INTO device_status(device_id,online,updated_at) VALUES(?,?,?) ON CONFLICT(device_id) DO UPDATE SET online=excluded.online, updated_at=excluded.updated_at", deviceID, boolInt(online), now)
	return err
}

func (s *SqliteStorage) GetStatus(deviceID string) (*DeviceStatus, error) {
	var x DeviceStatus
	err := s.db.QueryRow("SELECT device_id,online,updated_at FROM device_status WHERE device_id=?", deviceID).Scan(&x.DeviceID, &x.Online, &x.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}
