import { ImageResponse } from "next/og";

export const alt = "ISSP Builder — ISSP compliance, finally structured.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const pills = ["No login", "Works offline", "DICT 2026 aligned", "DPA-compliant", "Free"];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0D1B3E",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Gold top bar */}
        <div style={{ display: "flex", height: 8, backgroundColor: "#FCD116", width: "100%", flexShrink: 0 }} />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "48px 80px",
            justifyContent: "space-between",
          }}
        >
          {/* Eyebrow */}
          <div style={{ display: "flex" }}>
            <span style={{ color: "#FCD116", fontSize: 17, fontWeight: 700, letterSpacing: 4 }}>
              VOLUNTEER-BUILT · OPEN SOURCE · FOR PHILIPPINE GOVERNMENT
            </span>
          </div>

          {/* Headline block with left accent */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 28 }}>
            <div
              style={{
                display: "flex",
                width: 5,
                height: 220,
                backgroundColor: "#FCD116",
                borderRadius: 3,
                flexShrink: 0,
                marginTop: 4,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span style={{ color: "white", fontSize: 116, fontWeight: 900 }}>ISSP</span>
                <span style={{ color: "white", fontSize: 116, fontWeight: 900 }}>Builder</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 26, marginTop: 14 }}>
                The compliance tool the government hasn&apos;t built yet.
              </span>
            </div>
          </div>

          {/* Bottom row: pills + URL */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {pills.map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "7px 16px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, fontWeight: 700 }}>
              apps.carlosanton.io/issp
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
