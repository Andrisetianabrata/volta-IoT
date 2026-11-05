package rule

import (
	"math"
	"strconv"
	"time"

	"volta/pins"
	"volta/storage"
)

func Matches(op, value string, threshold float64) bool {
	v, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return op == "changed"
	}
	switch op {
	case "gt":
		return v > threshold
	case "gte":
		return v >= threshold
	case "lt":
		return v < threshold
	case "lte":
		return v <= threshold
	case "eq":
		return math.Abs(v-threshold) < 1e-9
	default:
		return false
	}
}

func Run(db storage.Storage, bus *pins.PinBus, cmds *pins.CommandBus, stop <-chan struct{}) {
	ch, unsub := bus.Subscribe()
	defer unsub()
	for {
		select {
		case <-stop:
			return
		case ev := <-ch:
			rules, err := db.ListRulesForPin(ev.DeviceID, ev.Pin)
			if err != nil {
				continue
			}
			for _, r := range rules {
				if !Matches(r.Op, ev.Value, r.Threshold) {
					continue
				}
				switch r.Action {
				case "set_pin":
					if r.ActionPin == "" {
						continue
					}
					_ = cmds.Send(pins.CmdRequest{DeviceID: ev.DeviceID, Pin: r.ActionPin, Value: r.ActionValue}, 2*time.Second)
					_ = db.UpsertPin(ev.DeviceID, r.ActionPin, r.ActionValue, storage.NowUnix())
				case "notify", "mail":
					_, _ = db.EnqueueMail("owner@localhost", "Rule "+r.ID, ev.Pin+"="+ev.Value, storage.NowUnix())
				}
			}
		}
	}
}

func RunTimer(db storage.Storage, cmds *pins.CommandBus, stop <-chan struct{}) {
	tick := time.NewTicker(60 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-stop:
			return
		case <-tick.C:
			_ = db
			_ = cmds
			_ = storage.NowUnix()
		}
	}
}
