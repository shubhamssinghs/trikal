import { API_BASE, type SlidesSpec } from "./artifact";

/** Render a chart artifact to a PNG data URL (off-screen Chart.js). */
async function chartDataUrl(chartId: string): Promise<string | null> {
  try {
    const d = await fetch(`${API_BASE}/charts/${chartId}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
    if (!d?.spec) return null;
    const { buildChartConfig } = await import("./chart");
    const { default: Chart } = await import("chart.js/auto");
    const canvas = document.createElement("canvas");
    canvas.width = 760; canvas.height = 420;
    const cfg = buildChartConfig(d.spec, { dark: false });
    cfg.options = { ...cfg.options, responsive: false, animation: false, devicePixelRatio: 2 };
    cfg.plugins = [{ id: "bg", beforeDraw: (c) => { const x = c.ctx; x.save(); x.globalCompositeOperation = "destination-over"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.restore(); } }];
    const chart = new Chart(canvas, cfg);
    const url = canvas.toDataURL("image/png");
    chart.destroy();
    return url;
  } catch { return null; }
}

/** Build + download a .pptx from a slides spec (lazy-loads pptxgenjs). */
export async function downloadSlidesPptx(spec: SlidesSpec, filename: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 in
  pptx.defineSlideMaster({ title: "BASE", background: { color: "FFFFFF" } });

  // Title slide.
  const cover = pptx.addSlide();
  cover.addText(spec.title, { x: 0.6, y: 2.6, w: 12, h: 1.5, fontSize: 40, bold: true, color: "1F2937", align: "left" });
  cover.addShape("rect", { x: 0.6, y: 2.45, w: 2.4, h: 0.08, fill: { color: "6366F1" } });

  for (const s of spec.slides) {
    const slide = pptx.addSlide();
    slide.addText(s.title, { x: 0.6, y: 0.4, w: 12, h: 0.9, fontSize: 26, bold: true, color: "1F2937" });
    slide.addShape("rect", { x: 0.6, y: 1.28, w: 12.1, h: 0.02, fill: { color: "E5E7EB" } });

    const img = s.chartId ? await chartDataUrl(s.chartId) : null;
    const bullets = (s.bullets ?? []).map((b) => ({ text: b, options: { bullet: { indent: 18 }, fontSize: 16, color: "374151", paraSpaceAfter: 8 } }));

    if (img && bullets.length) {
      slide.addText(bullets, { x: 0.6, y: 1.6, w: 6.2, h: 5.3, valign: "top" });
      slide.addImage({ data: img, x: 7.1, y: 1.7, w: 5.6, h: 3.1 });
    } else if (img) {
      slide.addImage({ data: img, x: 2.4, y: 1.7, w: 8.5, h: 4.7 });
    } else if (bullets.length) {
      slide.addText(bullets, { x: 0.6, y: 1.6, w: 12, h: 5.3, valign: "top" });
    }
    if (s.notes) slide.addNotes(s.notes);
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
