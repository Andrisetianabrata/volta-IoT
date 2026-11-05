package mailer

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/BurntSushi/toml"

	"volta/storage"
)

type MailerConfig struct {
	Host     string `toml:"host"`
	Port     uint16 `toml:"port"`
	TLS      string `toml:"tls"`
	Username string `toml:"username"`
	Password string `toml:"password"`
	From     string `toml:"from"`
	MaxQueue int    `toml:"max_queue"`
}

func DefaultMailerConfig() MailerConfig {
	return MailerConfig{
		Host:     "localhost",
		Port:     587,
		TLS:      "starttls",
		Username: "",
		Password: "",
		From:     "\"VOLTA.\" <no-reply@localhost>",
		MaxQueue: 10000,
	}
}

type mailerFile struct {
	SMTP  MailerConfig `toml:"smtp"`
	Queue queueFile    `toml:"queue"`
}

type queueFile struct {
	Max *int `toml:"max"`
}

func LoadMailerConfig(path string) MailerConfig {
	text, err := os.ReadFile(path)
	if err != nil {
		return DefaultMailerConfig()
	}
	var f mailerFile
	f.SMTP = DefaultMailerConfig()
	if _, err := toml.Decode(string(text), &f); err != nil {
		return DefaultMailerConfig()
	}
	if f.Queue.Max != nil {
		f.SMTP.MaxQueue = *f.Queue.Max
	}
	return f.SMTP
}

func RenderRegister(app, link string) (string, string) {
	return fmt.Sprintf("[%s] konfirmasi pendaftaran", app), fmt.Sprintf("Klik tautan berikut untuk verifikasi:\n%s\n", link)
}

func RenderReset(app, link string) (string, string) {
	return fmt.Sprintf("[%s] reset password", app), fmt.Sprintf("Reset password lewat tautan:\n%s\n", link)
}

func RenderPinEvent(device, pin, value string) (string, string) {
	return fmt.Sprintf("Event %s/%s", device, pin), fmt.Sprintf("Nilai terbaru %s pada %s: %s\n", pin, device, value)
}

func BackoffSecs(attempts int64) int64 {
	if attempts < 0 {
		attempts = 0
	}
	if attempts > 7 {
		attempts = 7
	}
	b := int64(30) << uint(attempts)
	if b > 3600 {
		return 3600
	}
	return b
}

type Mailer struct {
	cfg MailerConfig
}

func New(cfg MailerConfig) (*Mailer, error) {
	return &Mailer{cfg: cfg}, nil
}

func (m *Mailer) addr() string {
	return fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
}

func (m *Mailer) TestConnection() bool {
	conn, err := net.DialTimeout("tcp", m.addr(), 5*time.Second)
	if err != nil {
		return false
	}
	defer conn.Close()
	host, _, _ := net.SplitHostPort(m.addr())
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return false
	}
	defer c.Close()
	if err := c.Hello("localhost"); err != nil {
		return false
	}
	return true
}

func (m *Mailer) SendRaw(to, subject, body string) error {
	if !strings.Contains(to, "@") {
		return fmt.Errorf("bad to: %s", to)
	}
	from := m.cfg.From
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s", from, to, subject, body)
	if m.cfg.TLS == "smtps" || m.cfg.Port == 465 {
		return m.sendSMTPS(to, msg)
	}
	var auth smtp.Auth
	if m.cfg.Username != "" {
		auth = smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
	}
	return smtp.SendMail(m.addr(), auth, extractEmail(from), []string{to}, []byte(msg))
}

func (m *Mailer) sendSMTPS(to, msg string) error {
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 10 * time.Second}, "tcp", m.addr(), &tls.Config{ServerName: m.cfg.Host})
	if err != nil {
		return err
	}
	defer conn.Close()
	c, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		return err
	}
	defer c.Close()
	if m.cfg.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)); err != nil {
			return err
		}
	}
	if err := c.Mail(extractEmail(m.cfg.From)); err != nil {
		return err
	}
	if err := c.Rcpt(to); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		return err
	}
	return w.Close()
}

func extractEmail(from string) string {
	if i := strings.Index(from, "<"); i >= 0 {
		if j := strings.Index(from[i:], ">"); j >= 0 {
			return from[i+1 : i+j]
		}
	}
	return strings.TrimSpace(from)
}

func RunWorker(db storage.Storage, m *Mailer, maxQueue int, stop <-chan struct{}) {
	tick := time.NewTicker(5 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-stop:
			return
		case <-tick.C:
			now := storage.NowUnix()
			batch, err := db.ClaimMailBatch(20, now)
			if err != nil {
				continue
			}
			for _, item := range batch {
				if err := m.SendRaw(item.ToAddr, item.Subject, item.Body); err == nil {
					_ = db.MarkMailSent(item.ID)
				} else {
					attempts := item.Attempts + 1
					_ = db.MarkMailRetry(item.ID, attempts, now+BackoffSecs(attempts))
				}
			}
			if pending, err := db.MailPendingCount(); err == nil {
				if int(pending) > maxQueue {
					log.Printf("antrean mail meluap pending=%d max=%d", pending, maxQueue)
				}
			}
		}
	}
}
