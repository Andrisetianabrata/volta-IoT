package stats

import (
	"sync/atomic"
	"time"
)

type Stats struct {
	started time.Time
	msgs    atomic.Uint64
	cmds    atomic.Uint64
	logins  atomic.Uint64
}

func New() *Stats {
	return &Stats{started: time.Now()}
}

func (s *Stats) IncMsgs()   { s.msgs.Add(1) }
func (s *Stats) IncCmds()   { s.cmds.Add(1) }
func (s *Stats) IncLogins() { s.logins.Add(1) }

type Snapshot struct {
	UptimeSecs uint64 `json:"uptime_secs"`
	Msgs       uint64 `json:"msgs"`
	Cmds       uint64 `json:"cmds"`
	Logins     uint64 `json:"logins"`
}

func (s *Stats) Snapshot() Snapshot {
	return Snapshot{
		UptimeSecs: uint64(time.Since(s.started).Seconds()),
		Msgs:       s.msgs.Load(),
		Cmds:       s.cmds.Load(),
		Logins:     s.logins.Load(),
	}
}
