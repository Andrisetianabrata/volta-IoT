package pins

import (
	"volta/storage"
	"volta/topics"
)

func HandlePublish(db storage.Storage, bus *PinBus, deviceID, topic, payload string) error {
	parsed, ok := topics.Parse(topic)
	if !ok {
		return errUnknown("topik tidak dikenal")
	}
	if !topics.CanPublish(deviceID, parsed) {
		return errUnknown("acl menolak publish")
	}
	switch parsed.Kind {
	case topics.State:
		now := storage.NowUnix()
		if err := db.UpsertPin(parsed.Device, parsed.Pin, payload, now); err != nil {
			return err
		}
		if err := db.InsertHistory(parsed.Device, parsed.Pin, payload, now); err != nil {
			return err
		}
		bus.Publish(PinEvent{DeviceID: parsed.Device, Pin: parsed.Pin, Value: payload})
		return nil
	case topics.Log:
		bus.Publish(PinEvent{DeviceID: deviceID, Pin: "log", Value: payload})
		return nil
	default:
		return errUnknown("topik bukan untuk publish device")
	}
}

type publishError string

func (e publishError) Error() string { return string(e) }

func errUnknown(s string) error { return publishError(s) }
