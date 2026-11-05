package pins

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

type PinEvent struct {
	DeviceID string
	Pin      string
	Value    string
}

type PinBus struct {
	mu   sync.RWMutex
	subs map[uint64]chan PinEvent
	next uint64
	cap  int
}

func NewPinBus(capSize int) *PinBus {
	return &PinBus{subs: map[uint64]chan PinEvent{}, cap: capSize}
}

func DefaultBus() *PinBus {
	return NewPinBus(1024)
}

func (b *PinBus) Publish(ev PinEvent) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.subs {
		select {
		case ch <- ev:
		default:
		}
	}
}

func (b *PinBus) Subscribe() (<-chan PinEvent, func()) {
	ch := make(chan PinEvent, b.cap)
	b.mu.Lock()
	id := b.next
	b.next++
	b.subs[id] = ch
	b.mu.Unlock()
	return ch, func() {
		b.mu.Lock()
		delete(b.subs, id)
		b.mu.Unlock()
	}
}

type CmdRequest struct {
	DeviceID string
	Pin      string
	Value    string
}

type CmdMetrics struct {
	sent     atomic.Uint64
	timeouts atomic.Uint64
}

func (m *CmdMetrics) Sent() uint64     { return m.sent.Load() }
func (m *CmdMetrics) Timeouts() uint64 { return m.timeouts.Load() }

type CommandBus struct {
	mu      sync.RWMutex
	subs    map[uint64]chan CmdRequest
	next    uint64
	cap     int
	Metrics *CmdMetrics
}

func NewCommandBus(capSize int) *CommandBus {
	return &CommandBus{subs: map[uint64]chan CmdRequest{}, cap: capSize, Metrics: &CmdMetrics{}}
}

func (b *CommandBus) Subscribe() (<-chan CmdRequest, func()) {
	ch := make(chan CmdRequest, b.cap)
	b.mu.Lock()
	id := b.next
	b.next++
	b.subs[id] = ch
	b.mu.Unlock()
	return ch, func() {
		b.mu.Lock()
		delete(b.subs, id)
		b.mu.Unlock()
	}
}

func (b *CommandBus) Send(req CmdRequest, timeout time.Duration) error {
	b.Metrics.sent.Add(1)
	b.mu.RLock()
	for _, ch := range b.subs {
		select {
		case ch <- req:
		default:
		}
	}
	b.mu.RUnlock()
	done := make(chan struct{})
	go func() { close(done) }()
	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		b.Metrics.timeouts.Add(1)
		return fmt.Errorf("cmd timeout")
	}
}

type SharedBus = *PinBus
