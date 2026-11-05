package rule

import "testing"

func TestOpsWork(t *testing.T) {
	if !Matches("gt", "6", 5.0) || Matches("gt", "4", 5.0) {
		t.Fatal("gt")
	}
	if !Matches("lte", "5", 5.0) {
		t.Fatal("lte")
	}
}
