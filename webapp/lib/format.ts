/* Format waktu relatif Indonesia: "5 mnt lalu". Murni, aman server + klien. */

export function formatAgo(updatedAt: number | null, nowSec: number = Math.floor(Date.now() / 1000)): string {
  if (updatedAt === null || updatedAt === undefined) return "belum pernah";
  const d = Math.max(0, nowSec - updatedAt);
  if (d < 10) return "baru saja";
  if (d < 60) return `${d} dtk lalu`;
  const m = Math.floor(d / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}
