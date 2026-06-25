import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F3A6B",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold accent bar — top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#EFAE56", display: "flex" }} />

        {/* Decorative circle bg */}
        <div style={{
          position: "absolute",
          right: "-120px",
          top: "-120px",
          width: "500px",
          height: "500px",
          borderRadius: "9999px",
          background: "rgba(239,174,86,0.08)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute",
          left: "-80px",
          bottom: "-80px",
          width: "350px",
          height: "350px",
          borderRadius: "9999px",
          background: "rgba(239,174,86,0.06)",
          display: "flex",
        }} />

        {/* Logo mark — circle with diagonal */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "9999px",
            border: "5px solid #1A60AB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              width: "64px",
              height: "5px",
              background: "#EFAE56",
              transform: "rotate(-35deg)",
              borderRadius: "4px",
              display: "flex",
            }} />
          </div>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: "56px",
            fontWeight: "800",
            color: "white",
            letterSpacing: "-1px",
          }}>
            D-MATHS
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: "sans-serif",
          fontSize: "26px",
          color: "rgba(255,255,255,0.80)",
          textAlign: "center",
          margin: "0 0 12px 0",
          padding: "0 80px",
        }}>
          Excellence in Mathematics
        </p>

        {/* Sub-tagline */}
        <p style={{
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          margin: "0",
          padding: "0 100px",
        }}>
          Live video sessions · Personalised feedback · Student portal
        </p>

        {/* Gold pill */}
        <div style={{
          marginTop: "36px",
          padding: "10px 28px",
          borderRadius: "9999px",
          background: "#EFAE56",
          display: "flex",
        }}>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: "16px",
            fontWeight: "700",
            color: "#06152B",
          }}>
            Trusted by 200+ students across Nigeria
          </span>
        </div>

        {/* Gold accent bar — bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", background: "#EFAE56", display: "flex" }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
