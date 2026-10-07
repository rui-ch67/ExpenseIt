import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * The card shown when the link is shared (LinkedIn, Slack, messages).
 * Rendered once at build time from the brand mark and Bricolage ExtraBold.
 */
export const alt = "ExpenseIt: snap a receipt, see where your money goes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STRIPE = [
  { color: "#6a4bd8", share: 34 },
  { color: "#b6f23a", share: 20 },
  { color: "#ff7a1a", share: 16 },
  { color: "#3b4bf5", share: 12 },
  { color: "#ffc530", share: 10 },
  { color: "#ff3d8b", share: 8 },
];

export default async function OpenGraphImage() {
  const [font, mark] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_og/bricolage-grotesque-extrabold.ttf")),
    readFile(join(process.cwd(), "docs/brand/expenseit-mark.svg")),
  ]);
  const markSrc = `data:image/svg+xml;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", color: "#111111" }}>
        <img src={markSrc} width={630} height={630} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 64px 56px" }}>
          <div style={{ fontSize: 88, letterSpacing: "-0.04em", lineHeight: 1 }}>ExpenseIt</div>
          <div style={{ marginTop: 28, fontSize: 46, lineHeight: 1.02, letterSpacing: "-0.03em", color: "#5f5f5f", textWrap: "balance" }}>
            Snap a receipt, see where your money goes.
          </div>
          <div style={{ display: "flex", marginTop: "auto", height: 28, border: "4px solid #111111", background: "#111111", gap: 3 }}>
            {STRIPE.map(({ color, share }) => (
              <div key={color} style={{ display: "flex", flexGrow: share, flexBasis: 0, background: color }} />
            ))}
          </div>
          <div style={{ marginTop: 18, fontSize: 26, letterSpacing: "-0.01em" }}>Try the demo. No sign-up.</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bricolage Grotesque", data: font, style: "normal", weight: 800 }],
    },
  );
}
