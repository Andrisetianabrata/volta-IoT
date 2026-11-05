package acme

import "testing"

func TestStagingURLDiffers(t *testing.T) {
	if DirectoryURL(true) == DirectoryURL(false) {
		t.Fatal("same url")
	}
}
