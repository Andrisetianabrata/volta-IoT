package main

import (
	"flag"
	"fmt"
	"time"

	"volta/bench"
)

func main() {
	var host, path string
	var port uint
	var durationSecs uint64
	var concurrency uint
	flag.StringVar(&host, "host", "127.0.0.1", "host")
	flag.UintVar(&port, "port", 9443, "port")
	flag.StringVar(&path, "path", "/healthz", "path")
	flag.Uint64Var(&durationSecs, "duration-secs", 60, "duration seconds")
	flag.UintVar(&concurrency, "concurrency", 10, "concurrency")
	flag.Parse()
	cfg := bench.BenchConfig{
		Host:        host,
		Port:        uint16(port),
		Path:        path,
		Duration:    time.Duration(durationSecs) * time.Second,
		Concurrency: int(concurrency),
	}
	fmt.Printf("target http://%s:%d%s | %d dtk | %d koneksi\n", cfg.Host, cfg.Port, cfg.Path, durationSecs, cfg.Concurrency)
	rep := bench.Run(cfg)
	fmt.Printf("total %d | gagal %d | %.1f dtk | %.0f req/menit (%.0f req/detik)\n",
		rep.Total, rep.Errors, rep.ElapsedSecs, rep.RequestsPerMinute, rep.RequestsPerMinute/60.0)
}
