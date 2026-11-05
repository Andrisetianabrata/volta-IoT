package broker

import (
	"sync"

	"volta/topics"
)

type TopicKind = topics.Kind

const (
	TopicUnknown = topics.Unknown
	TopicState   = topics.State
	TopicCmd     = topics.Cmd
	TopicStatus  = topics.Status
	TopicLog     = topics.Log
)

type Topic = topics.Topic

func ParseTopic(t string) (Topic, bool)        { return topics.Parse(t) }
func StateTopic(device, pin string) string     { return topics.StateTopic(device, pin) }
func CmdTopic(device, pin string) string       { return topics.CmdTopic(device, pin) }
func StatusTopic(device string) string         { return topics.StatusTopic(device) }
func CanPublish(device string, t Topic) bool   { return topics.CanPublish(device, t) }
func CanSubscribe(device string, t Topic) bool { return topics.CanSubscribe(device, t) }

type BrokerConfig struct {
	LocalPort uint16 `toml:"local_port" json:"local_port"`
	TLSPort   uint16 `toml:"tls_port" json:"tls_port"`
}

func DefaultBrokerConfig() BrokerConfig {
	return BrokerConfig{LocalPort: 1883, TLSPort: 8883}
}

type Retained struct {
	mu    sync.RWMutex
	inner map[string]string
}

func NewRetained() *Retained {
	return &Retained{inner: map[string]string{}}
}

func (r *Retained) Set(topic, payload string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.inner[topic] = payload
}

func (r *Retained) Get(topic string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.inner[topic]
	return v, ok
}

type Broker struct {
	Config     BrokerConfig
	Retained   *Retained
	LiveTokens *sync.Map
}

func NewBroker(config BrokerConfig) *Broker {
	return &Broker{Config: config, Retained: NewRetained(), LiveTokens: &sync.Map{}}
}
