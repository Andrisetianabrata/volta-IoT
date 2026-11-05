package topics

import "testing"

func TestTopicsRoundtrip(t *testing.T) {
	if StateTopic("d1", "V0") != "volta/dev/d1/state/V0" {
		t.Fatal("state topic")
	}
	if _, ok := Parse("volta/dev/d1/state/V0"); !ok {
		t.Fatal("parse state")
	}
	if _, ok := Parse("volta/dev/d1/nope"); ok {
		t.Fatal("parse should fail")
	}
}

func TestACLEnforced(t *testing.T) {
	st, _ := Parse("volta/dev/d1/state/V0")
	if !CanPublish("d1", st) || CanPublish("d2", st) {
		t.Fatal("publish acl")
	}
	cmd, _ := Parse("volta/dev/d1/cmd/V0")
	if !CanSubscribe("d1", cmd) || CanPublish("d1", cmd) {
		t.Fatal("subscribe acl")
	}
}
