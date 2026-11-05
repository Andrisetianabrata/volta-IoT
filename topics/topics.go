package topics

import (
	"fmt"
	"strings"
)

type Kind int

const (
	Unknown Kind = iota
	State
	Cmd
	Status
	Log
)

type Topic struct {
	Kind   Kind
	Device string
	Pin    string
}

func Parse(t string) (Topic, bool) {
	p := strings.Split(t, "/")
	if len(p) == 5 && p[0] == "volta" && p[1] == "dev" && p[3] == "state" {
		return Topic{Kind: State, Device: p[2], Pin: p[4]}, true
	}
	if len(p) == 5 && p[0] == "volta" && p[1] == "dev" && p[3] == "cmd" {
		return Topic{Kind: Cmd, Device: p[2], Pin: p[4]}, true
	}
	if len(p) == 4 && p[0] == "volta" && p[1] == "dev" && p[3] == "status" {
		return Topic{Kind: Status, Device: p[2]}, true
	}
	if len(p) == 4 && p[0] == "volta" && p[1] == "dev" && p[3] == "log" {
		return Topic{Kind: Log, Device: p[2]}, true
	}
	return Topic{}, false
}

func StateTopic(device, pin string) string {
	return fmt.Sprintf("volta/dev/%s/state/%s", device, pin)
}

func CmdTopic(device, pin string) string {
	return fmt.Sprintf("volta/dev/%s/cmd/%s", device, pin)
}

func StatusTopic(device string) string {
	return fmt.Sprintf("volta/dev/%s/status", device)
}

func CanPublish(device string, t Topic) bool {
	switch t.Kind {
	case State, Log:
		return t.Device == device
	default:
		return false
	}
}

func CanSubscribe(device string, t Topic) bool {
	switch t.Kind {
	case Cmd, Status:
		return t.Device == device
	default:
		return false
	}
}
