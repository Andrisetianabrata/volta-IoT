import { ImageResponse } from "next/og";

// Bit Pair mark ( Volta Ink #111111 ) on transparent, for browsers
// without SVG favicon support. Dark-scheme variant is served at
// runtime by <ThemeFavicon /> via /volta-symbol-white.svg.

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          background: "transparent",
        }}
      >
        <div style={{ width: 12, height: 12, background: "#111111" }} />
        <div
          style={{ width: 12, height: 12, border: "3px solid #111111" }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
