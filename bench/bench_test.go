package bench

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRpmMath(t *testing.T) {
	if RequestsPerMinute(60, 60.0) != 60.0 || RequestsPerMinute(120, 30.0) != 240.0 {
		t.Fatal("rpm")
	}
	if RequestsPerMinute(0, 60.0) != 0.0 || RequestsPerMinute(10, 0.0) != 0.0 {
		t.Fatal("rpm zero")
	}
}

func TestZeroDurationNoRequests(t *testing.T) {
	rep := Run(BenchConfig{Duration: 0, Concurrency: 1})
	if rep.Total != 0 {
		t.Fatalf("total=%d", rep.Total)
	}
}

func TestHitsLocalServer(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprint(w, "ok")
	}))
	defer srv.Close()
	host, port := splitHostPort(t, srv.URL)
	rep := Run(BenchConfig{Host: host, Port: port, Path: "/healthz", Duration: time.Second, Concurrency: 2})
	if rep.Total == 0 {
		t.Fatal("tidak ada request tercatat")
	}
	if rep.RequestsPerMinute <= 0 {
		t.Fatal("rpm<=0")
	}
}

func splitHostPort(t *testing.T, url string) (string, uint16) {
	t.Helper()
	rest := url
	for i, c := range url {
		if c == '/' && i+1 < len(url) && url[i+1] == '/' {
			rest = url[i+2:]
			break
		}
	}
	host := rest
	var port uint16 = 80
	for i := len(rest) - 1; i >= 0; i-- {
		if rest[i] == ':' {
			host = rest[:i]
			var p int
			_, _ = fmt.Sscanf(rest[i+1:], "%d", &p)
			port = uint16(p)
			break
		}
	}
	return host, port
}
