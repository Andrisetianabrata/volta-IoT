package logo

import (
	"os"
	"strings"
)

const Version = "0.1.0"

const Banner = "████████  ████████\n" +
	"████████  ██    ██  VOLTA. v" + Version + "\n" +
	"████████  ██    ██  MQTT IoT server\n" +
	"████████  ████████"

const copper = "\x1b[38;2;192;122;36m"
const reset = "\x1b[0m"

func BannerColored() string {
	return copper + "████████  ████████" + reset + "\n" +
		copper + "████████  ██    ██" + reset + "  VOLTA. v" + Version + "\n" +
		copper + "████████  ██    ██" + reset + "  MQTT IoT server\n" +
		copper + "████████  ████████" + reset
}

func SupportsColor() bool {
	if _, ok := os.LookupEnv("NO_COLOR"); ok {
		return false
	}
	if os.Getenv("TERM") == "dumb" {
		return false
	}
	_ = strings.TrimSpace
	return true
}
