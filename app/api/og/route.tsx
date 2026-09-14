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
        {/* Orange accent bar — top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#F5951E", display: "flex" }} />

        {/* Decorative circles */}
        <div style={{ position: "absolute", right: "-120px", top: "-120px", width: "500px", height: "500px", borderRadius: "9999px", background: "rgba(245,149,30,0.10)", display: "flex" }} />
        <div style={{ position: "absolute", left: "-80px", bottom: "-80px", width: "350px", height: "350px", borderRadius: "9999px", background: "rgba(245,149,30,0.07)", display: "flex" }} />

        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
          <span style={{ fontFamily: "sans-serif", fontSize: "96px", fontWeight: "800", color: "white", letterSpacing: "-2px", display: "flex" }}>
            NOVELIA
          </span>
          <span style={{ fontFamily: "sans-serif", fontSize: "34px", fontWeight: "700", color: "#F5951E", letterSpacing: "16px", marginTop: "2px", paddingLeft: "16px", display: "flex" }}>
            ACADEMY
          </span>
        </div>

        {/* Tagline */}
        <p style={{ fontFamily: "sans-serif", fontSize: "26px", color: "rgba(255,255,255,0.80)", textAlign: "center", margin: "0 0 12px 0", padding: "0 80px" }}>
          Excellence in learning
        </p>

        {/* Sub-tagline */}
        <p style={{ fontFamily: "sans-serif", fontSize: "18px", color: "rgba(255,255,255,0.45)", textAlign: "center", margin: "0", padding: "0 100px" }}>
          Live video sessions · Personalised feedback · Student portal
        </p>

        {/* Orange pill */}
        <div style={{ marginTop: "36px", padding: "10px 28px", borderRadius: "9999px", background: "#F5951E", display: "flex" }}>
          <span style={{ fontFamily: "sans-serif", fontSize: "16px", fontWeight: "700", color: "#06152B" }}>
            Trusted by 200+ students worldwide
          </span>
        </div>

        {/* Orange accent bar — bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6px", background: "#F5951E", display: "flex" }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
