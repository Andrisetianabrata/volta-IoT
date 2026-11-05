package seed

import (
	"volta/storage"
)

const DemoBoardName = "Contoh Ruang Server"

func widgetCfg(device, label, extra string, x, y, w, h uint32) string {
	return `{"device":"` + device + `","label":"` + label + `",` + extra + `"x":` + itoa(x) + `,"y":` + itoa(y) + `,"w":` + itoa(w) + `,"h":` + itoa(h) + `}`
}

func itoa(v uint32) string {
	if v == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for v > 0 {
		i--
		b[i] = byte('0' + v%10)
		v /= 10
	}
	return string(b[i:])
}

func SeedDemo(db storage.Storage) (bool, error) {
	admin, err := db.GetUserByEmail("admin@admin.com")
	if err != nil || admin == nil {
		return false, err
	}
	boards, err := db.ListDashboards(admin.ID)
	if err != nil {
		return false, err
	}
	for _, d := range boards {
		if d.Name == DemoBoardName {
			return false, nil
		}
	}
	now := storage.NowUnix()
	for _, dd := range [][2]string{{"demo-ruang-a", "Contoh Ruang A"}, {"demo-ruang-b", "Contoh Pompa B"}} {
		if d, _ := db.GetDevice(dd[0]); d == nil {
			if err := db.CreateDevice(dd[0], admin.ID, dd[1], now); err != nil {
				return false, err
			}
		}
	}
	if err := db.CreateDashboard("demo-board-1", admin.ID, DemoBoardName, now); err != nil {
		return false, err
	}
	widgets := [][4]string{
		{"demo-w1", "gauge", "t1", widgetCfg("demo-ruang-a", "Suhu", `"unit":"°C","min":0,"max":50,`, 0, 0, 4, 1)},
		{"demo-w2", "labeled-value", "hum", widgetCfg("demo-ruang-a", "Kelembapan", `"unit":"%",`, 4, 0, 4, 1)},
		{"demo-w3", "led", "relay", widgetCfg("demo-ruang-b", "Pompa", "", 8, 0, 2, 1)},
		{"demo-w4", "button", "relay", widgetCfg("demo-ruang-b", "Pompa", `"on":"1","off":"0",`, 10, 0, 2, 1)},
		{"demo-w5", "history-chart", "t1", widgetCfg("demo-ruang-a", "Suhu 24 jam", `"unit":"°C",`, 0, 1, 8, 2)},
		{"demo-w6", "slider", "pwm", widgetCfg("demo-ruang-b", "Redup lampu", `"min":0,"max":1023,`, 8, 1, 4, 1)},
	}
	for _, w := range widgets {
		if err := db.CreateWidget(w[0], "demo-board-1", w[1], w[2], w[3]); err != nil {
			return false, err
		}
	}
	_ = db.UpsertPin("demo-ruang-a", "t1", "28.5", now)
	_ = db.UpsertPin("demo-ruang-a", "hum", "61", now)
	_ = db.UpsertPin("demo-ruang-b", "relay", "1", now)
	_ = db.UpsertPin("demo-ruang-b", "pwm", "220", now)
	for i := int64(0); i < 24; i++ {
		v := 27.0 + float64((i*37)%40)/10.0
		vs := ftoa1(v)
		_ = db.InsertHistory("demo-ruang-a", "t1", vs, now-(23-i)*3600)
	}
	return true, nil
}

func ftoa1(v float64) string {
	iv := int(v*10 + 0.5)
	return itoa(uint32(iv/10)) + "." + itoa(uint32(iv%10))
}
