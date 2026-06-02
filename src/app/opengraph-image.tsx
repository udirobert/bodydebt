// Body Debt — branded opengraph image
import { ImageResponse } from "next/og";

export const alt = "BODY DEBT — Your body keeps the score.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0B",
          position: "relative",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234,88,12,0.18) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
          }}
        />

        {/* Orb */}
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 35%, #EA580C, #991B1B 55%, #0A0A0B 100%)",
            marginBottom: 40,
            boxShadow: "0 0 80px rgba(234,88,12,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />

        {/* App name */}
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.28em",
            color: "#524F4C",
            textTransform: "uppercase",
            fontFamily: "Arial, sans-serif",
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          BODY DEBT
        </div>

        {/* Score placeholder */}
        <div
          style={{
            fontSize: 140,
            fontFamily: "Georgia, serif",
            color: "#EA580C",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          72
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "#A8A29E",
            marginTop: 24,
            fontFamily: "Arial, sans-serif",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          Your body keeps the score.
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#3a3835",
            fontSize: 16,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          bodydebt.app
        </div>
      </div>
    ),
    size,
  );
}
