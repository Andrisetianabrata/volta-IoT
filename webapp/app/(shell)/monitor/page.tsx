import { ComingSoon, PageHead } from "@/components/coming-soon";

export default function MonitorPage() {
  return (
    <div>
      <PageHead title="Monitor" desc="Pin live, grafik, dan perintah untuk device terpilih." />
      <ComingSoon task="W5 + W6" desc="Pilih device, pantau pin live, kirim perintah, dan lihat grafik history. Isi menyusul setelah daftar device (W4) jadi." />
    </div>
  );
}
