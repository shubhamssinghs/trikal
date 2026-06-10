"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { Loader2, BarChart3 } from "lucide-react";
import { buildChartConfig, type ChartSpec } from "@/lib/chart";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

type ChartRow = { id: string; title: string; type: string; spec: ChartSpec };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Render a saved chart by id (referenced in markdown via a ```chart <id>``` block). */
export function ChartEmbed({ chartId }: { chartId: string }) {
  const [chart, setChart] = useState<ChartRow | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    let cancelled = false;
    fetch(`${API_BASE}/charts/${chartId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) { if (d?.spec) { setChart(d); setState("ok"); } else setState("error"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [chartId]);

  if (state === "loading") {
    return <div className="my-2 grid h-64 place-items-center rounded-xl border border-border bg-surface-2/20"><Loader2 size={16} className="animate-spin text-muted" /></div>;
  }
  if (state === "error" || !chart) {
    return <div className="my-2 grid h-20 place-items-center rounded-xl border border-border bg-surface-2/20 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><BarChart3 size={13} /> Chart unavailable</span></div>;
  }

  const cfg = buildChartConfig(chart.spec, { dark });
  return (
    <div className="my-3 rounded-xl border border-border bg-surface p-3">
      <div className="h-72">
        <Chart type={cfg.type} data={cfg.data} options={cfg.options} />
      </div>
    </div>
  );
}
