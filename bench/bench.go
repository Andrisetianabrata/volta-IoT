package bench

import (
	"bufio"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

type BenchConfig struct {
	Host        string
	Port        uint16
	Path        string
	Duration    time.Duration
	Concurrency int
}

func DefaultBenchConfig() BenchConfig {
	return BenchConfig{Host: "127.0.0.1", Port: 9443, Path: "/healthz", Duration: 60 * time.Second, Concurrency: 10}
}

type BenchReport struct {
	Total             uint64
	Errors            uint64
	ElapsedSecs       float64
	RequestsPerMinute float64
}

func RequestsPerMinute(total uint64, elapsedSecs float64) float64 {
	if elapsedSecs <= 0 {
		return 0
	}
	return float64(total) / elapsedSecs * 60.0
}

func requestOnce(conn net.Conn, req []byte) error {
	if _, err := conn.Write(req); err != nil {
		return err
	}
	rd := bufio.NewReader(conn)
	var contentLen = -1
	for {
		line, err := rd.ReadString('\n')
		if err != nil {
			return err
		}
		if line == "\r\n" {
			break
		}
		if i := strings.Index(line, ":"); i > 0 {
			name := strings.TrimSpace(line[:i])
			if strings.EqualFold(name, "content-length") {
				n, err := strconv.Atoi(strings.TrimSpace(line[i+1:]))
				if err != nil {
					return fmt.Errorf("bad content-length")
				}
				contentLen = n
			}
		}
	}
	if contentLen < 0 {
		return fmt.Errorf("tanpa content-length")
	}
	need := contentLen
	buf := make([]byte, 8192)
	for need > 0 {
		n := need
		if n > len(buf) {
			n = len(buf)
		}
		rn, err := rd.Read(buf[:n])
		if err != nil {
			return err
		}
		if rn == 0 {
			return fmt.Errorf("koneksi ditutup")
		}
		need -= rn
	}
	return nil
}

func itoaPort(p uint16) string {
	return strconv.Itoa(int(p))
}

func worker(cfg BenchConfig, req []byte, deadline time.Time, done, failed *atomic.Uint64) {
	addr := net.JoinHostPort(cfg.Host, itoaPort(cfg.Port))
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
		if err != nil {
			failed.Add(1)
			time.Sleep(50 * time.Millisecond)
			continue
		}
		for time.Now().Before(deadline) {
			_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
			if err := requestOnce(conn, req); err != nil {
				failed.Add(1)
				break
			}
			done.Add(1)
		}
		conn.Close()
	}
}

func Run(cfg BenchConfig) BenchReport {
	if cfg.Duration <= 0 || cfg.Concurrency <= 0 {
		return BenchReport{}
	}
	start := time.Now()
	deadline := start.Add(cfg.Duration)
	req := []byte(fmt.Sprintf("GET %s HTTP/1.1\r\nHost: %s\r\nConnection: keep-alive\r\n\r\n", cfg.Path, cfg.Host))
	var done, failed atomic.Uint64
	fin := make(chan struct{}, cfg.Concurrency)
	for i := 0; i < cfg.Concurrency; i++ {
		go func() {
			worker(cfg, req, deadline, &done, &failed)
			fin <- struct{}{}
		}()
	}
	for i := 0; i < cfg.Concurrency; i++ {
		<-fin
	}
	elapsed := time.Since(start).Seconds()
	total := done.Load()
	return BenchReport{Total: total, Errors: failed.Load(), ElapsedSecs: elapsed, RequestsPerMinute: RequestsPerMinute(total, elapsed)}
}
