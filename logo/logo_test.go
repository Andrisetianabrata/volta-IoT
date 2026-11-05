package logo

import (
	"strings"
	"testing"
)

func TestBannerNamesVolta(t *testing.T) {
	if !strings.Contains(Banner, "VOLTA.") {
		t.Fatal("banner missing VOLTA.")
	}
}

func TestBannerIsFourAlignedRows(t *testing.T) {
	rows := strings.Split(Banner, "\n")
	if len(rows) != 4 {
		t.Fatalf("rows=%d", len(rows))
	}
	for _, row := range rows {
		if !strings.HasPrefix(row, "█") {
			t.Fatalf("row %q", row)
		}
	}
}

func TestBannerShowsSolidAndRing(t *testing.T) {
	rows := strings.Split(Banner, "\n")
	if rows[0] != "████████  ████████" || rows[3] != "████████  ████████" {
		t.Fatalf("%q %q", rows[0], rows[3])
	}
	if !strings.HasPrefix(rows[1], "████████  ██    ██") || !strings.HasPrefix(rows[2], "████████  ██    ██") {
		t.Fatalf("%q %q", rows[1], rows[2])
	}
}
