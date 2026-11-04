/* Helper skala grafik murni (aman server + klien). */

export type PinPoint = { t: string; v: number };

/** Tick bulat di atas maksimum. */
export function niceCeil(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  const n = max / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
}
