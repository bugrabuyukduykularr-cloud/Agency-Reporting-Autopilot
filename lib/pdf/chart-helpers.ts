import type { ChartDataPoint } from "@/types/report-data";

// ── Shared helpers ────────────────────────────────────────────────────────────

function niceMax(max: number): number {
  if (max <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitude) * magnitude;
}

function shortLabel(dateStr: string): string {
  // "2026-01-15" → "Jan 15"
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Line Chart SVG ────────────────────────────────────────────────────────────

/**
 * Builds a static SVG line chart string for use in Puppeteer-rendered PDFs.
 * Uses cubic bezier curves for smooth lines with a filled area below.
 */
export function buildLineChartSVG(
  data: ChartDataPoint[],
  width: number,
  height: number,
  color: string
): string {
  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="Arial, sans-serif">No data</text>
    </svg>`;
  }

  const pad = { top: 20, right: 16, bottom: 36, left: 50 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const maxVal = niceMax(Math.max(...values, 1));
  const n = data.length;

  // Map data to SVG coordinates
  const pts = data.map((d, i) => ({
    x: pad.left + (i / Math.max(n - 1, 1)) * innerW,
    y: pad.top + (1 - d.value / maxVal) * innerH,
  }));

  // Smooth cubic bezier path
  function makePath(points: { x: number; y: number }[]): string {
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
  }

  const linePath = makePath(pts);

  // Closed path for fill area
  const fillPath =
    `${linePath} ` +
    `L ${pts[pts.length - 1].x} ${pad.top + innerH} ` +
    `L ${pts[0].x} ${pad.top + innerH} Z`;

  // Y-axis labels (4 ticks)
  const yTicks = [0, 1, 2, 3].map((i) => {
    const val = (maxVal * (3 - i)) / 3;
    const y = pad.top + (i / 3) * innerH;
    const label =
      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0);
    return { y, label };
  });

  // X-axis labels: first, middle, last
  const xLabels: { x: number; label: string }[] = [];
  if (n > 0) xLabels.push({ x: pts[0].x, label: shortLabel(data[0].date) });
  if (n > 2) {
    const mid = Math.floor((n - 1) / 2);
    xLabels.push({ x: pts[mid].x, label: shortLabel(data[mid].date) });
  }
  if (n > 1)
    xLabels.push({
      x: pts[n - 1].x,
      label: shortLabel(data[n - 1].date),
    });

  // Data point dots
  const dots = pts
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="${color}" />`
    )
    .join("");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.01" />
    </linearGradient>
  </defs>

  <!-- Grid lines -->
  ${yTicks
    .map(
      (t) =>
        `<line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${pad.left + innerW}" y2="${t.y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />`
    )
    .join("\n  ")}

  <!-- Y-axis labels -->
  ${yTicks
    .map(
      (t) =>
        `<text x="${pad.left - 6}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="10" font-family="Arial, sans-serif">${t.label}</text>`
    )
    .join("\n  ")}

  <!-- X-axis labels -->
  ${xLabels
    .map(
      (l) =>
        `<text x="${l.x.toFixed(1)}" y="${(pad.top + innerH + 16).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="Arial, sans-serif">${l.label}</text>`
    )
    .join("\n  ")}

  <!-- Filled area -->
  <path d="${fillPath}" fill="url(#fillGrad)" />

  <!-- Line -->
  <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />

  <!-- Dots -->
  ${dots}
</svg>`;
}

// ── Bar Chart SVG ─────────────────────────────────────────────────────────────

/**
 * Builds a static SVG bar chart for spend/metric data over a time period.
 */
export function buildBarChartSVG(
  data: ChartDataPoint[],
  width: number,
  height: number,
  color: string
): string {
  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="Arial, sans-serif">No data</text>
    </svg>`;
  }

  const pad = { top: 20, right: 16, bottom: 36, left: 50 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const maxVal = niceMax(Math.max(...values, 1));
  const n = data.length;
  const barW = Math.max(1, innerW / n - 1);

  // Y-axis ticks
  const yTicks = [0, 1, 2, 3].map((i) => {
    const val = (maxVal * (3 - i)) / 3;
    const y = pad.top + (i / 3) * innerH;
    const label =
      val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;
    return { y, label };
  });

  // X-axis labels: first, middle, last
  const xLabels: { x: number; label: string }[] = [];
  const barX = (i: number) => pad.left + (i / n) * innerW + barW / 2;
  if (n > 0) xLabels.push({ x: barX(0), label: shortLabel(data[0].date) });
  if (n > 2) {
    const mid = Math.floor((n - 1) / 2);
    xLabels.push({ x: barX(mid), label: shortLabel(data[mid].date) });
  }
  if (n > 1)
    xLabels.push({ x: barX(n - 1), label: shortLabel(data[n - 1].date) });

  // Bars
  const bars = data
    .map((d, i) => {
      const x = pad.left + (i / n) * innerW;
      const barH = Math.max(1, (d.value / maxVal) * innerH);
      const y = pad.top + innerH - barH;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" opacity="0.8" rx="1" />`;
    })
    .join("\n  ");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">

  <!-- Grid lines -->
  ${yTicks
    .map(
      (t) =>
        `<line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${pad.left + innerW}" y2="${t.y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />`
    )
    .join("\n  ")}

  <!-- Y-axis labels -->
  ${yTicks
    .map(
      (t) =>
        `<text x="${pad.left - 6}" y="${(t.y + 4).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-size="10" font-family="Arial, sans-serif">${t.label}</text>`
    )
    .join("\n  ")}

  <!-- X-axis labels -->
  ${xLabels
    .map(
      (l) =>
        `<text x="${l.x.toFixed(1)}" y="${(pad.top + innerH + 16).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="Arial, sans-serif">${l.label}</text>`
    )
    .join("\n  ")}

  <!-- Bars -->
  ${bars}
</svg>`;
}
