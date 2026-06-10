import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun } from "docx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const MAX_W = 600; // px — fit the page width

type Png = { data: Uint8Array; width: number; height: number };

/** Render a Mermaid source string to a PNG (in-browser). */
async function mermaidToPng(code: string): Promise<Png | null> {
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict" });
    const { svg } = await mermaid.render(`x${Math.floor(performance.now())}`, code.trim());
    return await svgToPng(svg);
  } catch {
    return null;
  }
}

function svgToPng(svg: string): Promise<Png | null> {
  const vb = /viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  const w = vb ? Math.ceil(parseFloat(vb[1])) : 800;
  const h = vb ? Math.ceil(parseFloat(vb[2])) : 400;
  let sized = svg;
  if (!/<svg[^>]*\swidth=/.test(sized)) sized = sized.replace(/<svg/, `<svg width="${w}" height="${h}"`);
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = w * scale; c.height = h * scale;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(async (b) => {
        if (!b) return resolve(null);
        resolve({ data: new Uint8Array(await b.arrayBuffer()), width: w, height: h });
      }, "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function imageParagraph(png: Png): Paragraph {
  const width = Math.min(png.width, MAX_W);
  const height = Math.round(png.height * (width / png.width));
  return new Paragraph({ children: [new ImageRun({ type: "png", data: png.data, transformation: { width, height } })] });
}

function inlineRuns(text: string): TextRun[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    return m ? new TextRun({ text: m[1], bold: true }) : new TextRun(p);
  });
}

function lineToParagraph(line: string): Paragraph {
  if (!line.trim()) return new Paragraph({ text: "" });
  const h = /^(#{1,4})\s+(.*)$/.exec(line);
  if (h) {
    const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][h[1].length - 1];
    return new Paragraph({ heading: level, children: inlineRuns(h[2]) });
  }
  const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
  if (bullet) {
    const indent = Math.floor((line.length - line.trimStart().length) / 2);
    return new Paragraph({ bullet: { level: Math.min(indent, 3) }, children: inlineRuns(bullet[1]) });
  }
  return new Paragraph({ children: inlineRuns(line) });
}

/** Build a .docx Blob from markdown — embedding mermaid/diagram blocks as images. */
export async function markdownToDocx(title: string, content: string, projectId: string): Promise<Blob> {
  const children: Paragraph[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const fence = /^```(\w*)\s*$/.exec(lines[i].trim());
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { body.push(lines[i]); i++; }
      i++; // skip closing fence
      const code = body.join("\n").trim();
      if (lang === "mermaid") {
        const png = await mermaidToPng(code);
        children.push(png ? imageParagraph(png) : new Paragraph({ children: [new TextRun({ text: "[diagram]", italics: true })] }));
      } else if (lang === "diagram") {
        const png = await diagramToPng(code.trim(), projectId);
        children.push(png.png ? imageParagraph(png.png) : new Paragraph({ children: [new TextRun({ text: `[Diagram: ${png.title ?? code} — view in app]`, italics: true })] }));
      } else if (lang === "chart") {
        const png = await chartToPng(code.trim());
        children.push(png.png ? imageParagraph(png.png) : new Paragraph({ children: [new TextRun({ text: `[Chart: ${png.title ?? code} — view in app]`, italics: true })] }));
      } else {
        body.forEach((l) => children.push(new Paragraph({ children: [new TextRun({ text: l, font: "Consolas" })] })));
      }
      continue;
    }
    children.push(lineToParagraph(lines[i]));
    i++;
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

/** Render a saved chart → PNG via an off-screen Chart.js canvas (white background). */
async function chartToPng(id: string): Promise<{ png?: Png; title?: string }> {
  try {
    const d = await fetch(`${API_BASE}/charts/${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
    if (!d?.spec) return {};
    const { buildChartConfig } = await import("./chart");
    const { default: Chart } = await import("chart.js/auto");
    const w = 800, h = 450;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const cfg = buildChartConfig(d.spec, { dark: false });
    cfg.options = { ...cfg.options, responsive: false, animation: false, devicePixelRatio: 2 };
    // Paint white behind the chart so it isn't transparent in the doc.
    cfg.plugins = [{
      id: "whiteBg",
      beforeDraw: (c) => {
        const ctx = c.ctx; ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); ctx.restore();
      },
    }];
    const chart = new Chart(canvas, cfg);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
    chart.destroy();
    if (!blob) return { title: d.title };
    return { png: { data: new Uint8Array(await blob.arrayBuffer()), width: w, height: h }, title: d.title };
  } catch {
    return {};
  }
}

/** Resolve a referenced diagram → PNG when it's mermaid; otherwise a title placeholder. */
async function diagramToPng(id: string, projectId: string): Promise<{ png?: Png; title?: string }> {
  void projectId;
  try {
    const d = await fetch(`${API_BASE}/diagrams/${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
    if (!d) return {};
    if (d.schemaJson?.mermaid) { const png = await mermaidToPng(d.schemaJson.mermaid); return png ? { png, title: d.title } : { title: d.title }; }
    return { title: d.title };
  } catch {
    return {};
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
