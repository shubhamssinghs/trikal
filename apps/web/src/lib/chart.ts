import type { ChartConfiguration, ChartType as CjType } from "chart.js";

export type ChartSeries = { label: string; data: number[]; color?: string };
export interface ChartSpec {
  type: "bar" | "line" | "area" | "pie" | "doughnut";
  title?: string;
  labels: string[];
  series: ChartSeries[];
  stacked?: boolean;
  valueLabel?: string;
}

// A calm, pleasant palette (works on light + dark).
export const PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
];

const alpha = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Build a Chart.js config from a chart spec. `dark` themes the axes/legend. */
export function buildChartConfig(spec: ChartSpec, opts: { dark?: boolean } = {}): ChartConfiguration {
  const dark = opts.dark ?? false;
  const fg = dark ? "#e5e7eb" : "#374151";
  const grid = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const isPie = spec.type === "pie" || spec.type === "doughnut";
  const isArea = spec.type === "area";
  const cjType: CjType = isArea ? "line" : (spec.type as CjType);

  let datasets;
  if (isPie) {
    const s = spec.series[0] ?? { label: "", data: [] };
    datasets = [{
      label: s.label,
      data: s.data,
      backgroundColor: spec.labels.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: dark ? "#1f2937" : "#ffffff",
      borderWidth: 2,
    }];
  } else {
    const single = spec.series.length === 1;
    datasets = spec.series.map((s, si) => {
      const base = s.color || PALETTE[si % PALETTE.length];
      const perBarColors = single && cjType === "bar" ? spec.labels.map((_, i) => PALETTE[i % PALETTE.length]) : base;
      return {
        label: s.label,
        data: s.data,
        backgroundColor: cjType === "line" ? alpha(base, isArea ? 0.18 : 0) : perBarColors,
        borderColor: base,
        borderWidth: cjType === "line" ? 2.5 : 0,
        borderRadius: cjType === "bar" ? 6 : 0,
        borderSkipped: false,
        maxBarThickness: 56,
        fill: isArea,
        tension: 0.35,
        pointRadius: cjType === "line" ? 2.5 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: base,
      };
    });
  }

  return {
    type: cjType,
    data: { labels: spec.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 4 },
      plugins: {
        legend: {
          display: isPie || spec.series.length > 1,
          position: "top",
          labels: { color: fg, usePointStyle: true, boxWidth: 8, font: { size: 11 } },
        },
        title: spec.title ? { display: true, text: spec.title, color: fg, font: { size: 13, weight: 600 } } : { display: false },
        tooltip: { usePointStyle: true },
      },
      scales: isPie ? {} : {
        x: { stacked: spec.stacked, ticks: { color: fg, font: { size: 11 } }, grid: { display: false } },
        y: {
          stacked: spec.stacked,
          beginAtZero: true,
          ticks: { color: fg, font: { size: 11 } },
          grid: { color: grid },
          title: spec.valueLabel ? { display: true, text: spec.valueLabel, color: fg } : { display: false },
        },
      },
    },
  };
}
