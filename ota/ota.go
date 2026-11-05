package ota

import (
	"encoding/json"
	"sync"

	"volta/storage"
)

type OtaJob struct {
	DeviceID  string `json:"device_id"`
	URL       string `json:"url"`
	Version   string `json:"version"`
	StartedAt int64  `json:"started_at"`
}

type Manager struct {
	mu   sync.RWMutex
	jobs map[string]OtaJob
}

func NewManager() *Manager {
	return &Manager{jobs: map[string]OtaJob{}}
}

func (m *Manager) Start(deviceID, url, version string) OtaJob {
	job := OtaJob{DeviceID: deviceID, URL: url, Version: version, StartedAt: storage.NowUnix()}
	m.mu.Lock()
	m.jobs[deviceID] = job
	m.mu.Unlock()
	return job
}

func (m *Manager) Stop(deviceID string) {
	m.mu.Lock()
	delete(m.jobs, deviceID)
	m.mu.Unlock()
}

func (m *Manager) Get(deviceID string) (OtaJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	j, ok := m.jobs[deviceID]
	return j, ok
}

func CmdPayload(job OtaJob) string {
	b, _ := json.Marshal(map[string]any{"ota": map[string]string{"url": job.URL, "version": job.Version}})
	return string(b)
}
