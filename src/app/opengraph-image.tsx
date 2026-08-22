import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "TopMySaaS weekly SaaS ranking leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = await readFile(
  join(process.cwd(), "public", "topmysaas-logo.png"),
  "base64",
);
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#f7f9fa",
        background: "#07090b",
        padding: "72px 78px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {/* next/image cannot render inside ImageResponse. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={70}
          height={70}
          style={{ borderRadius: 35 }}
        />
        <div style={{ fontSize: 44, fontWeight: 760 }}>TopMySaaS</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 82,
            lineHeight: 1.02,
            fontWeight: 800,
          }}
        >
          <div style={{ display: "flex" }}>Top 5 SaaS.</div>
          <div style={{ display: "flex" }}>
            Ranked by&nbsp;<span style={{ color: "#67e85f" }}>bid.</span>
          </div>
        </div>
        <div style={{ fontSize: 29, color: "#aab2ba" }}>
          Every active paid listing is ranked. The Top 5 stand out until Monday at 00:00 UTC.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#aab2ba",
          fontSize: 23,
        }}
      >
        <span>topmysaas.com</span>
        <span style={{ color: "#67e85f" }}>● LIVE WEEKLY BOARD</span>
      </div>
    </div>,
    size,
  );
}
