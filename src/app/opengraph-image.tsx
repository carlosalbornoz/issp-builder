import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const alt = "ISSP Builder — your agency's DICT 2026 Information Systems Strategic Plan, structured.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The app's four-part accent palette (the equalizer logo bars) — the brand mark.
const PART_COLORS = ["#2563EB", "#D97706", "#16A34A", "#7C3AED"];
const BAR_HEIGHTS = [22, 34, 27, 40];

// Same faces as the app (Fraunces display + IBM Plex Sans body) and a warm-dark app
// screenshot, read from disk so the card renders without any network dependency.
const FONT_DIR = join(process.cwd(), "src/app/og-fonts");
const ASSET_DIR = join(process.cwd(), "src/app/og-assets");
const fraunces700 = readFileSync(join(FONT_DIR, "Fraunces-700.ttf"));
const plex400 = readFileSync(join(FONT_DIR, "IBMPlexSans-400.ttf"));
const plex600 = readFileSync(join(FONT_DIR, "IBMPlexSans-600.ttf"));
const appShot = `data:image/png;base64,${readFileSync(join(ASSET_DIR, "app-shot.png")).toString("base64")}`;

export default function OgImage() {
  const pills = ["DICT 2026 aligned", "Local-first", "Free"];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "1200px",
          height: "630px",
          backgroundColor: "#1C1A17",
          backgroundImage:
            "radial-gradient(820px circle at 8% 0%, #2C2620 0%, rgba(44,38,32,0) 55%), radial-gradient(720px circle at 100% 100%, #2A2219 0%, rgba(42,34,25,0) 52%)",
          fontFamily: "IBM Plex Sans",
        }}
      >
        {/* Left — wordmark, tagline, pills */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 472,
            flexShrink: 0,
            padding: "56px 0 54px 76px",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 40 }}>
              {PART_COLORS.map((color, i) => (
                <div
                  key={color}
                  style={{ display: "flex", width: 10, height: BAR_HEIGHTS[i], backgroundColor: color, borderRadius: 5 }}
                />
              ))}
            </div>
            <span style={{ color: "#9C9893", fontSize: 15, fontWeight: 600, letterSpacing: 3 }}>
              FOR PHILIPPINE GOVERNMENT AGENCIES
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.98 }}>
              <span style={{ color: "#F0EDE8", fontFamily: "Fraunces", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
                ISSP
              </span>
              <span style={{ color: "#F0EDE8", fontFamily: "Fraunces", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
                Builder
              </span>
            </div>
            <span style={{ color: "#B7B2AB", fontSize: 25, marginTop: 20, maxWidth: 380, lineHeight: 1.35 }}>
              Build your agency&apos;s 3-year ICT strategic plan — structured to the DICT 2026 template,
              right in your browser.
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pills.map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "7px 15px",
                    borderRadius: 18,
                    border: "1px solid #383430",
                    backgroundColor: "#242220",
                    color: "rgba(240,237,232,0.85)",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <span style={{ color: "#6E6A64", fontSize: 18, fontWeight: 600 }}>apps.carlosanton.io/issp</span>
          </div>
        </div>

        {/* Right — app screenshot in a browser frame, bleeding off the edge */}
        <div style={{ display: "flex", position: "relative", flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: 54,
              left: 28,
              width: 860,
              borderRadius: 16,
              border: "1px solid #3A3631",
              backgroundColor: "#201E1B",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 34,
                paddingLeft: 16,
                backgroundColor: "#2A2723",
                borderBottom: "1px solid #383430",
              }}
            >
              {["#56514B", "#56514B", "#56514B"].map((c, i) => (
                <div key={i} style={{ display: "flex", width: 11, height: 11, borderRadius: 6, backgroundColor: c }} />
              ))}
            </div>
            <img src={appShot} width={858} height={549} style={{ display: "flex" }} alt="" />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces700, weight: 700, style: "normal" },
        { name: "IBM Plex Sans", data: plex400, weight: 400, style: "normal" },
        { name: "IBM Plex Sans", data: plex600, weight: 600, style: "normal" },
      ],
    },
  );
}
