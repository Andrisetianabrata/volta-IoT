import { ImageResponse } from "next/og";

// Home-screen icon: Bit Pair mark ( Volta Ink ) on Volta Paper,
// with safe-zone padding per VOLTA-guidelines.md section 2.

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "#F5F3EE",
        }}
      >
        <div style={{ width: 56, height: 56, background: "#111111" }} />
        <div
          style={{ width: 56, height: 56, border: "14px solid #111111" }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
