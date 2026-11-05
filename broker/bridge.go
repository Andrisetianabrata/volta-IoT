package broker

import (
	"bytes"
	"fmt"
	"log"
	"sync"
	"time"

	mqtt "github.com/mochi-mqtt/server/v2"
	"github.com/mochi-mqtt/server/v2/listeners"
	"github.com/mochi-mqtt/server/v2/packets"

	"volta/pins"
	"volta/storage"
	"volta/topics"
)

type TokenCache struct {
	mu sync.RWMutex
	m  map[string]struct{}
}

func NewTokenCache() *TokenCache {
	return &TokenCache{m: map[string]struct{}{}}
}

func (c *TokenCache) Contains(t string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	_, ok := c.m[t]
	return ok
}

func (c *TokenCache) Add(t string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[t] = struct{}{}
}

func (c *TokenCache) Replace(set map[string]struct{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m = set
}

func LoadValidTokens(db storage.Storage) (map[string]struct{}, error) {
	toks, err := db.ListValidTokens()
	if err != nil {
		return nil, err
	}
	set := make(map[string]struct{}, len(toks))
	for _, t := range toks {
		set[t] = struct{}{}
	}
	return set, nil
}

type VoltaHook struct {
	mqtt.HookBase
	db       storage.Storage
	bus      *pins.PinBus
	cache    *TokenCache
	presence *Presence
	server   *mqtt.Server
}

func (h *VoltaHook) ID() string { return "volta-auth" }

func (h *VoltaHook) Provides(b byte) bool {
	return bytes.Contains([]byte{
		mqtt.OnConnectAuthenticate,
		mqtt.OnACLCheck,
		mqtt.OnPublish,
		mqtt.OnDisconnect,
	}, []byte{b})
}

func (h *VoltaHook) lookupDevice(token string) (string, bool) {
	if len(token) != 32 {
		return "", false
	}
	if h.cache.Contains(token) {
		return h.lookupDB(token)
	}
	if dev, ok := h.lookupDB(token); ok {
		h.cache.Add(token)
		return dev, true
	}
	return "", false
}

func (h *VoltaHook) lookupDB(token string) (string, bool) {
	rec, err := h.db.LookupToken(token)
	if err != nil || rec == nil || rec.Revoked != 0 {
		return "", false
	}
	return rec.DeviceID, true
}

func (h *VoltaHook) deviceOf(cl *mqtt.Client) (string, bool) {
	return h.lookupDevice(string(cl.Properties.Username))
}

func (h *VoltaHook) OnConnectAuthenticate(cl *mqtt.Client, pk packets.Packet) bool {
	_, ok := h.lookupDevice(string(pk.Connect.Username))
	return ok
}

func (h *VoltaHook) OnACLCheck(cl *mqtt.Client, topic string, write bool) bool {
	dev, ok := h.deviceOf(cl)
	if !ok {
		return false
	}
	t, valid := topics.Parse(topic)
	if !valid {
		if !write && (topic == "volta/#" || topic == "volta/dev/#") {
			return false
		}
		return false
	}
	if write {
		if t.Kind == topics.Status && t.Device == dev {
			return true
		}
		return topics.CanPublish(dev, t)
	}
	return topics.CanSubscribe(dev, t)
}

func StatusIsOnline(payload []byte) bool {
	return string(payload) == "online"
}

func (h *VoltaHook) OnPublish(cl *mqtt.Client, pk packets.Packet) (packets.Packet, error) {
	t, valid := topics.Parse(pk.TopicName)
	if !valid {
		return pk, nil
	}
	dev, ok := h.deviceOf(cl)
	if !ok {
		if cl.ID == mqtt.InlineClientId {
			dev = t.Device
		} else {
			return pk, nil
		}
	}
	switch t.Kind {
	case topics.State:
		now := storage.NowUnix()
		_ = h.db.UpsertPin(t.Device, t.Pin, string(pk.Payload), now)
		_ = h.db.InsertHistory(t.Device, t.Pin, string(pk.Payload), now)
		h.bus.Publish(pins.PinEvent{DeviceID: t.Device, Pin: t.Pin, Value: string(pk.Payload)})
		_ = h.db.SetStatus(t.Device, true, now)
		h.presence.Touch(t.Device)
	case topics.Log:
		h.bus.Publish(pins.PinEvent{DeviceID: t.Device, Pin: "log", Value: string(pk.Payload)})
		_ = h.db.SetStatus(t.Device, true, storage.NowUnix())
		h.presence.Touch(t.Device)
	case topics.Status:
		online := StatusIsOnline(pk.Payload)
		_ = h.db.SetStatus(t.Device, online, storage.NowUnix())
		if online {
			h.presence.Touch(t.Device)
		} else {
			h.presence.Forget(t.Device)
		}
		_ = dev
	}
	return pk, nil
}

func (h *VoltaHook) OnDisconnect(cl *mqtt.Client, _ error, _ bool) {
	if dev, ok := h.deviceOf(cl); ok {
		_ = h.db.SetStatus(dev, false, storage.NowUnix())
		h.presence.Forget(dev)
	}
}

type Presence struct {
	mu           sync.Mutex
	seen         map[string]time.Time
	offlineAfter time.Duration
}

func NewPresence(offlineAfter time.Duration) *Presence {
	return &Presence{seen: map[string]time.Time{}, offlineAfter: offlineAfter}
}

func (p *Presence) Touch(device string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.seen[device] = time.Now()
}

func (p *Presence) Forget(device string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.seen, device)
}

func (p *Presence) SweepOnce(db storage.Storage) {
	p.mu.Lock()
	var silent []string
	for d, at := range p.seen {
		if time.Since(at) > p.offlineAfter {
			silent = append(silent, d)
		}
	}
	p.mu.Unlock()
	for _, d := range silent {
		_ = db.SetStatus(d, false, storage.NowUnix())
		p.Forget(d)
	}
}

func RunSweeper(db storage.Storage, p *Presence, stop <-chan struct{}) {
	secs := int(p.offlineAfter.Seconds() / 3)
	if secs < 1 {
		secs = 1
	}
	if secs > 15 {
		secs = 15
	}
	tick := time.NewTicker(time.Duration(secs) * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-stop:
			return
		case <-tick.C:
			p.SweepOnce(db)
		}
	}
}

func ResetStalePresence(db storage.Storage) {
	for _, stale := range mustListOnline(db) {
		_ = db.SetStatus(stale, false, storage.NowUnix())
	}
}

func mustListOnline(db storage.Storage) []string {
	ids, _ := db.ListOnlineDeviceIDs()
	return ids
}

type Bridge struct {
	server   *mqtt.Server
	db       storage.Storage
	bus      *pins.PinBus
	cmds     *pins.CommandBus
	presence *Presence
}

func NewBridge(db storage.Storage, bus *pins.PinBus, cmds *pins.CommandBus, port uint16, cache *TokenCache, presence *Presence) (*Bridge, error) {
	server := mqtt.New(&mqtt.Options{InlineClient: true})
	hook := &VoltaHook{db: db, bus: bus, cache: cache, presence: presence, server: server}
	if err := server.AddHook(hook, nil); err != nil {
		return nil, err
	}
	tcp := listeners.NewTCP(listeners.Config{ID: "t1", Address: fmt.Sprintf("0.0.0.0:%d", port)})
	if err := server.AddListener(tcp); err != nil {
		return nil, err
	}
	return &Bridge{server: server, db: db, bus: bus, cmds: cmds, presence: presence}, nil
}

func (b *Bridge) Serve() error {
	return b.server.Serve()
}

func (b *Bridge) Close() error {
	return b.server.Close()
}

func (b *Bridge) PublishCmd(deviceID, pin, value string) error {
	return b.server.Publish(CmdTopic(deviceID, pin), []byte(value), false, 1)
}

func (b *Bridge) Presence() *Presence { return b.presence }

func ServeForever(db storage.Storage, bus *pins.PinBus, cmds *pins.CommandBus, port uint16, cache *TokenCache, offlineAfter time.Duration, stop <-chan struct{}) {
	ResetStalePresence(db)
	presence := NewPresence(offlineAfter)
	go RunSweeper(db, presence, stop)
	go func() {
		tick := time.NewTicker(30 * time.Second)
		defer tick.Stop()
		for {
			select {
			case <-stop:
				return
			case <-tick.C:
				if toks, err := LoadValidTokens(db); err == nil {
					cache.Replace(toks)
				}
			}
		}
	}()
	cmdCh, unsub := cmds.Subscribe()
	defer unsub()
	var current *Bridge
	var curMu sync.RWMutex
	go func() {
		for {
			select {
			case <-stop:
				return
			case req := <-cmdCh:
				curMu.RLock()
				br := current
				curMu.RUnlock()
				if br != nil {
					_ = br.PublishCmd(req.DeviceID, req.Pin, req.Value)
				}
			}
		}
	}()
	for {
		br, err := NewBridge(db, bus, cmds, port, cache, presence)
		if err != nil {
			log.Printf("mqtt broker gagal start: %s, coba lagi 5 dtk", err)
			select {
			case <-stop:
				return
			case <-time.After(5 * time.Second):
				continue
			}
		}
		curMu.Lock()
		current = br
		curMu.Unlock()
		if err := br.Serve(); err != nil {
			log.Printf("mqtt broker gagal serve: %s", err)
			curMu.Lock()
			current = nil
			curMu.Unlock()
			_ = br.Close()
			select {
			case <-stop:
				return
			case <-time.After(5 * time.Second):
				continue
			}
		}
		log.Printf("mqtt broker jalan port=%d", port)
		<-stop
		curMu.Lock()
		current = nil
		curMu.Unlock()
		_ = br.Close()
		return
	}
}
