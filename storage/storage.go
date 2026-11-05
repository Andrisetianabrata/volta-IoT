package storage

import (
	"embed"
	"time"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func MigrationSQL() []string {
	return []string{"migrations/0001_init.sql", "migrations/0002_shares.sql"}
}

func MigrationContent(name string) (string, error) {
	b, err := migrationFS.ReadFile(name)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	PassHash  string `json:"pass_hash"`
	CreatedAt int64  `json:"created_at"`
}

type Session struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	CreatedAt int64  `json:"created_at"`
	ExpiresAt int64  `json:"expires_at"`
}

type Device struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"created_at"`
}

type DeviceToken struct {
	Token     string `json:"token"`
	DeviceID  string `json:"device_id"`
	Revoked   int64  `json:"revoked"`
	CreatedAt int64  `json:"created_at"`
}

type PinState struct {
	DeviceID  string `json:"device_id"`
	Pin       string `json:"pin"`
	Value     string `json:"value"`
	UpdatedAt int64  `json:"updated_at"`
}

type PinHistory struct {
	ID       int64  `json:"id"`
	DeviceID string `json:"device_id"`
	Pin      string `json:"pin"`
	Value    string `json:"value"`
	Ts       int64  `json:"ts"`
}

type Dashboard struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"created_at"`
}

type Widget struct {
	ID          string `json:"id"`
	DashboardID string `json:"dashboard_id"`
	Kind        string `json:"kind"`
	Pin         string `json:"pin"`
	Config      string `json:"config"`
}

type MailItem struct {
	ID       int64  `json:"id"`
	ToAddr   string `json:"to_addr"`
	Subject  string `json:"subject"`
	Body     string `json:"body"`
	Attempts int64  `json:"attempts"`
	NextTry  int64  `json:"next_try"`
	Status   string `json:"status"`
}

type Rule struct {
	ID          string  `json:"id"`
	UserID      string  `json:"user_id"`
	DeviceID    string  `json:"device_id"`
	Pin         string  `json:"pin"`
	Op          string  `json:"op"`
	Threshold   float64 `json:"threshold"`
	Action      string  `json:"action"`
	ActionPin   string  `json:"action_pin"`
	ActionValue string  `json:"action_value"`
	Enabled     int64   `json:"enabled"`
}

type DeviceStatus struct {
	DeviceID  string `json:"device_id"`
	Online    int64  `json:"online"`
	UpdatedAt int64  `json:"updated_at"`
}

type Share struct {
	Token       string `json:"token"`
	DashboardID string `json:"dashboard_id"`
	CreatedAt   int64  `json:"created_at"`
}

type Storage interface {
	CreateUser(id, email, passHash string, now int64) error
	GetUserByEmail(email string) (*User, error)
	CreateSession(id, userID string, now, expires int64) error
	GetSession(id string) (*Session, error)
	DeleteSession(id string) error

	CreateDevice(id, userID, name string, now int64) error
	ListDevices(userID string) ([]Device, error)
	GetDevice(id string) (*Device, error)
	DeleteDevice(id string) error

	IssueToken(token, deviceID string, now int64) error
	LookupToken(token string) (*DeviceToken, error)
	ListValidTokens() ([]string, error)
	ListOnlineDeviceIDs() ([]string, error)
	RevokeToken(token string) error

	UpsertPin(deviceID, pin, value string, now int64) error
	GetPin(deviceID, pin string) (*PinState, error)
	ListPins(deviceID string) ([]PinState, error)
	InsertHistory(deviceID, pin, value string, ts int64) error
	QueryHistory(deviceID, pin string, from, to, limit int64) ([]PinHistory, error)

	CreateDashboard(id, userID, name string, now int64) error
	GetDashboard(id string) (*Dashboard, error)
	ListDashboards(userID string) ([]Dashboard, error)
	UpdateDashboard(id, name string) error
	DeleteDashboard(id string) error
	CreateWidget(id, dashboardID, kind, pin, config string) error
	GetWidget(id string) (*Widget, error)
	UpdateWidget(id, kind, pin, config string) error
	DeleteWidget(id string) error
	ListWidgets(dashboardID string) ([]Widget, error)

	CreateShare(token, dashboardID string, now int64) error
	GetShare(token string) (*Share, error)
	GetShareByDashboard(dashboardID string) (*Share, error)
	DeleteShareByDashboard(dashboardID string) error

	EnqueueMail(to, subject, body string, now int64) (int64, error)
	ClaimMailBatch(limit, now int64) ([]MailItem, error)
	MarkMailSent(id int64) error
	MarkMailRetry(id, attempts, nextTry int64) error
	MailPendingCount() (int64, error)

	CreateRule(r Rule) error
	ListRules(userID string) ([]Rule, error)
	ListRulesForPin(deviceID, pin string) ([]Rule, error)

	SetStatus(deviceID string, online bool, now int64) error
	GetStatus(deviceID string) (*DeviceStatus, error)

	Close() error
}

func NowUnix() int64 {
	return time.Now().Unix()
}
