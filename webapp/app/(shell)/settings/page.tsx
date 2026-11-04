import { ComingSoon, PageHead } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <div>
      <PageHead title="Settings" desc="Tema, akun, info server, dan status koneksi." />
      <ComingSoon task="W14" desc="Toggle tema, info server, status WS + sambung ulang. Tema dan keluar sudah tersedia di bilah atas." />
    </div>
  );
}
