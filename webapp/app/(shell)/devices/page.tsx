import { api } from "@/lib/api";
import type { Device, DeviceStatus } from "@/lib/api";
import { PageHead } from "@/components/coming-soon";
import { DeviceManager, type DeviceRow } from "@/components/device-manager";

export default async function DevicesPage() {
  const r = await api.devices();
  if (!r.ok) {
    return (
      <div>
        <PageHead title="Devices" desc="Daftar + tambah + hapus device, satu layar." />
        <p className="mt-4 text-[15px] text-[var(--color-muted)]">Daftar device tidak bisa dimuat: {r.error.message}</p>
      </div>
    );
  }
  const rows: DeviceRow[] = await Promise.all(
    r.data.map(async (device: Device) => {
      const s = await api.deviceStatus(device.id);
      const status: DeviceStatus = s.ok ? s.data : { online: false, updated_at: null };
      return { device, status };
    })
  );
  return (
    <div>
      <PageHead title="Devices" desc={`${rows.length} device. Status jujur per device.`} />
      <DeviceManager initial={rows} />
    </div>
  );
}
