import { ImageResponse } from "next/og";

export const alt = "ISSP Builder — your agency's DICT 2026 Information Systems Strategic Plan, structured.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The app's four-part accent palette (the equalizer logo bars) — the brand mark.
const PART_COLORS = ["#2563EB", "#D97706", "#16A34A", "#7C3AED"];
const BAR_HEIGHTS = [46, 74, 58, 88];

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
          backgroundColor: "#1C1A17",
          backgroundImage:
            "radial-gradient(900px circle at 14% 8%, #2C2620 0%, rgba(44,38,32,0) 55%), radial-gradient(720px circle at 98% 100%, #2A2219 0%, rgba(42,34,25,0) 52%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "62px 80px",
            justifyContent: "space-between",
          }}
        >
          {/* Brand mark — the four equalizer bars + eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 88 }}>
              {PART_COLORS.map((color, i) => (
                <div
                  key={color}
                  style={{
                    display: "flex",
                    width: 16,
                    height: BAR_HEIGHTS[i],
                    backgroundColor: color,
                    borderRadius: 8,
                  }}
                />
              ))}
            </div>
            <span style={{ color: "#9C9893", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
              VOLUNTEER-BUILT · OPEN SOURCE · FOR PH GOVERNMENT
            </span>
          </div>

          {/* Headline + tagline */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#F0EDE8", fontSize: 124, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
              ISSP Builder
            </span>
            <span style={{ color: "#B7B2AB", fontSize: 31, marginTop: 22, maxWidth: 880, lineHeight: 1.3 }}>
              Build your agency&apos;s 3-year Information Systems Strategic Plan — structured to the
              DICT 2026 template, local-first, and free.
            </span>
          </div>

          {/* Pills + URL */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {pills.map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "8px 17px",
                    borderRadius: 20,
                    border: "1px solid #383430",
                    backgroundColor: "#242220",
                    color: "rgba(240,237,232,0.85)",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <span style={{ color: "#6E6A64", fontSize: 19, fontWeight: 700 }}>
              apps.carlosanton.io/issp
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
