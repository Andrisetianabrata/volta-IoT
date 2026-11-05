package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"volta/auth"
	"volta/broker"
	"volta/cli"
	"volta/config"
	vhttp "volta/http"
	"volta/logo"
	"volta/mailer"
	"volta/rule"
	"volta/seed"
	"volta/storage"
)

func main() {
	if len(os.Args) > 0 {
		_ = os.Args[0]
	}
	args, err := cli.Parse(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(2)
	}
	if logo.SupportsColor() && isTerminal() {
		fmt.Println(logo.BannerColored())
	} else {
		fmt.Println(logo.Banner)
	}
	if err := os.MkdirAll(args.DataFolder, 0o755); err != nil {
		log.Fatalf("cannot create data folder: %s", err)
	}
	cfg, err := config.Load(args.ResolvedConfigPath())
	if err != nil {
		log.Fatalf("config: %s", err)
	}

	dbPath := cfg.DbPath(args.DataFolder)
	if dir := filepath.Dir(dbPath); dir != "" {
		_ = os.MkdirAll(dir, 0o755)
	}
	db, err := storage.NewSqliteStorage(dbPath, cfg.Storage.BusyTimeoutMs)
	if err != nil {
		log.Fatalf("storage: %s", err)
	}
	defer db.Close()

	if ok, err := auth.SeedAdmin(db); err != nil {
		log.Printf("seed admin gagal: %s", err)
	} else if ok {
		log.Printf("seed admin admin@admin.com siap")
	}

	if os.Getenv("VOLTA_SEED_DEMO") == "1" {
		if ok, err := seed.SeedDemo(db); err != nil {
			log.Printf("seed demo gagal: %s", err)
		} else if ok {
			log.Printf("seed demo: board contoh dibuat")
		}
	}

	mailerCfg := mailer.LoadMailerConfig(filepath.Join(args.DataFolder, "mailer.toml"))
	state := vhttp.NewAppState(db, mailerCfg)

	stop := make(chan struct{})
	defer close(stop)

	if state.Mailer != nil {
		go mailer.RunWorker(db, state.Mailer, mailerCfg.MaxQueue, stop)
	}

	go rule.Run(db, state.Bus, state.Cmds, stop)

	cache := broker.NewTokenCache()
	if toks, err := broker.LoadValidTokens(db); err == nil {
		cache.Replace(toks)
	}
	go broker.ServeForever(db, state.Bus, state.Cmds, cfg.Mqtt.LocalPort, cache, 30*time.Second, stop)

	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Http.HttpsPort)
	log.Printf("volta starting data_folder=%s mqtt_local=%d mqtt_tls=%d https=%d", args.DataFolder, cfg.Mqtt.LocalPort, cfg.Mqtt.TLSPort, cfg.Http.HttpsPort)
	srv := &http.Server{Addr: addr, Handler: vhttp.Router(state)}
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		if ce := containsInUse(err.Error()); ce {
			log.Fatalf("cannot bind %s: %s (port dipakai? ubah [http] https_port di server.toml)", addr, err)
		}
		log.Fatalf("serve: %s", err)
	}
}

func isTerminal() bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}

func containsInUse(s string) bool {
	for _, sub := range []string{"address already in use", "bind"} {
		if len(s) >= len(sub) {
			for i := 0; i+len(sub) <= len(s); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
