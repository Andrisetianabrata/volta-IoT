/* Pesan validasi per-input: selalu di bawah input/placeholder,
   teks + role=alert, bukan warna saja. */

export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] leading-snug text-[#C4242A]">
      {message}
    </p>
  );
}
