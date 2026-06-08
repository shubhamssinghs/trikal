import {
  User, Smartphone, Server, Database, ListOrdered, Lock, Cloud,
  Network, AppWindow, GitBranch, MessageSquare,
  Ticket, Users, Video, Mail, Box, Workflow, Share2,
  ArrowRightLeft, CalendarClock, Activity,
  Frame, Type, Square, Circle, Diamond, Cylinder, Hexagon, RectangleHorizontal, Triangle, StickyNote,
  type LucideIcon,
} from "lucide-react";

export type DLink = { type: string; id: string; label: string };
export type DNode = {
  id: string; type: string; label: string; layer?: string;
  x?: number; y?: number;
  width?: number; height?: number;
  color?: string; fontSize?: number;
  parentId?: string;
  link?: DLink;
  metadata?: Record<string, unknown>;
};
export type DEdge = {
  id: string; from: string; to: string; label?: string;
  style?: "solid" | "dashed" | "dotted";
  shape?: "bezier" | "smooth" | "step" | "straight";
  color?: string;
  animated?: boolean;
};
export type DLayer = { id: string; label: string; order?: number };
export type DiagramData = {
  title: string; description?: string; style: string;
  layers: DLayer[]; nodes: DNode[]; edges: DEdge[];
  /** For text-based (Mermaid) diagram kinds: the raw Mermaid source. */
  mermaid?: string;
  /** Set by AI generation — the editor runs a tidy auto-layout on first open. */
  autoLayout?: boolean;
};

export type DiagramSummary = {
  id: string; title: string; description?: string | null;
  kind?: string;
  createdAt: string; updatedAt: string;
};

/**
 * node type key -> icon definition.
 *  - `svg`   : path to a real service/brand SVG bundled in /public/icons (preferred render).
 *  - `icon`  : lucide fallback used for generic concepts or if the SVG is missing.
 *  - `color` : accent color used to tint the lucide fallback box.
 */
type IconDef = { icon: LucideIcon; color: string; svg?: string };

/**
 * Tech-stack icons (frontend / backend / database / devops). `file` is the
 * bundled SVG under /public/icons/tech and the suffix of the node type
 * (`tech.<file>`). `cat` groups them in the palette.
 */
type TechCat = "Frontend" | "Backend" | "Database" | "DevOps";
const TECH: { file: string; label: string; color: string; cat: TechCat }[] = [
  // Frontend
  { file: "react", label: "React", color: "#61dafb", cat: "Frontend" },
  { file: "nextjs", label: "Next.js", color: "#000000", cat: "Frontend" },
  { file: "vue", label: "Vue", color: "#42b883", cat: "Frontend" },
  { file: "angular", label: "Angular", color: "#dd0031", cat: "Frontend" },
  { file: "svelte", label: "Svelte", color: "#ff3e00", cat: "Frontend" },
  { file: "typescript", label: "TypeScript", color: "#3178c6", cat: "Frontend" },
  { file: "javascript", label: "JavaScript", color: "#f7df1e", cat: "Frontend" },
  { file: "tailwind", label: "Tailwind", color: "#06b6d4", cat: "Frontend" },
  { file: "html5", label: "HTML5", color: "#e34f26", cat: "Frontend" },
  { file: "css3", label: "CSS3", color: "#1572b6", cat: "Frontend" },
  { file: "redux", label: "Redux", color: "#764abc", cat: "Frontend" },
  // Backend & languages
  { file: "nodejs", label: "Node.js", color: "#5fa04e", cat: "Backend" },
  { file: "express", label: "Express", color: "#000000", cat: "Backend" },
  { file: "nestjs", label: "NestJS", color: "#e0234e", cat: "Backend" },
  { file: "python", label: "Python", color: "#3776ab", cat: "Backend" },
  { file: "django", label: "Django", color: "#092e20", cat: "Backend" },
  { file: "flask", label: "Flask", color: "#000000", cat: "Backend" },
  { file: "java", label: "Java", color: "#f89820", cat: "Backend" },
  { file: "spring", label: "Spring", color: "#6db33f", cat: "Backend" },
  { file: "go", label: "Go", color: "#00add8", cat: "Backend" },
  { file: "rails", label: "Rails", color: "#cc0000", cat: "Backend" },
  { file: "php", label: "PHP", color: "#777bb4", cat: "Backend" },
  { file: "graphql", label: "GraphQL", color: "#e10098", cat: "Backend" },
  { file: "dotnet", label: ".NET", color: "#512bd4", cat: "Backend" },
  // Databases & cache
  { file: "mongodb", label: "MongoDB", color: "#47a248", cat: "Database" },
  { file: "postgresql", label: "PostgreSQL", color: "#4169e1", cat: "Database" },
  { file: "mysql", label: "MySQL", color: "#4479a1", cat: "Database" },
  { file: "redis", label: "Redis", color: "#dc382d", cat: "Database" },
  { file: "sqlite", label: "SQLite", color: "#003b57", cat: "Database" },
  { file: "elasticsearch", label: "Elasticsearch", color: "#005571", cat: "Database" },
  { file: "firebase", label: "Firebase", color: "#ffca28", cat: "Database" },
  { file: "supabase", label: "Supabase", color: "#3ecf8e", cat: "Database" },
  { file: "prisma", label: "Prisma", color: "#2d3748", cat: "Database" },
  // DevOps & cloud
  { file: "docker", label: "Docker", color: "#2496ed", cat: "DevOps" },
  { file: "kubernetes", label: "Kubernetes", color: "#326ce5", cat: "DevOps" },
  { file: "github-actions", label: "GitHub Actions", color: "#2088ff", cat: "DevOps" },
  { file: "gitlab", label: "GitLab", color: "#fc6d26", cat: "DevOps" },
  { file: "terraform", label: "Terraform", color: "#7b42bc", cat: "DevOps" },
  { file: "nginx", label: "NGINX", color: "#009639", cat: "DevOps" },
  { file: "vercel", label: "Vercel", color: "#000000", cat: "DevOps" },
  { file: "netlify", label: "Netlify", color: "#00c7b7", cat: "DevOps" },
  { file: "cloudflare", label: "Cloudflare", color: "#f38020", cat: "DevOps" },
  { file: "gcp", label: "Google Cloud", color: "#4285f4", cat: "DevOps" },
  { file: "kafka", label: "Kafka", color: "#231f20", cat: "DevOps" },
  { file: "rabbitmq", label: "RabbitMQ", color: "#ff6600", cat: "DevOps" },
];

const TECH_ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  TECH.map((t) => [`tech.${t.file}`, { icon: Box, color: t.color, svg: `/icons/tech/${t.file}.svg` }]),
);

// AWS — official service icons. type = `aws.<file>`, svg in /public/icons/aws.
const AWS: { file: string; label: string }[] = [
  { file: "ec2", label: "EC2" }, { file: "lambda", label: "Lambda" }, { file: "ecs", label: "ECS" },
  { file: "eks", label: "EKS" }, { file: "fargate", label: "Fargate" }, { file: "elastic-beanstalk", label: "Beanstalk" },
  { file: "s3", label: "S3" },
  { file: "rds", label: "RDS" }, { file: "aurora", label: "Aurora" }, { file: "dynamodb", label: "DynamoDB" },
  { file: "redshift", label: "Redshift" }, { file: "elasticache", label: "ElastiCache" },
  { file: "alb", label: "Load Balancer" }, { file: "cloudfront", label: "CloudFront" }, { file: "route53", label: "Route 53" },
  { file: "vpc", label: "VPC" }, { file: "api-gateway", label: "API Gateway" }, { file: "appsync", label: "AppSync" },
  { file: "sqs", label: "SQS" }, { file: "sns", label: "SNS" }, { file: "eventbridge", label: "EventBridge" },
  { file: "kinesis", label: "Kinesis" }, { file: "step-functions", label: "Step Functions" },
  { file: "iam", label: "IAM" }, { file: "cognito", label: "Cognito" }, { file: "kms", label: "KMS" },
  { file: "secrets-manager", label: "Secrets Mgr" }, { file: "waf", label: "WAF" },
  { file: "cloudwatch", label: "CloudWatch" }, { file: "cloudtrail", label: "CloudTrail" }, { file: "cloudformation", label: "CloudFormation" },
  { file: "amplify", label: "Amplify" }, { file: "athena", label: "Athena" }, { file: "glue", label: "Glue" },
  { file: "ses", label: "SES" },
];
const AWS_ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  AWS.map((a) => [`aws.${a.file}`, { icon: Cloud, color: "#ff9900", svg: `/icons/aws/${a.file}.svg` }]),
);

// Azure — service icons available in /public/icons/azure. `key` keeps the
// stable node type (referenced by templates / AI), `file` is the SVG name.
const AZURE: { key: string; file: string; label: string }[] = [
  { key: "app-service", file: "app-service", label: "App Service" },
  { key: "sql", file: "sql-database", label: "SQL Database" },
  { key: "devops", file: "devops", label: "DevOps" },
];
const AZURE_ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  AZURE.map((a) => [`azure.${a.key}`, { icon: AppWindow, color: "#0078d4", svg: `/icons/azure/${a.file}.svg` }]),
);

const ICON_MAP: Record<string, IconDef> = {
  ...TECH_ICON_MAP,
  ...AWS_ICON_MAP,
  ...AZURE_ICON_MAP,
  // Generic concepts — no brand, keep clean lucide glyphs.
  "generic.user": { icon: User, color: "#64748b" },
  "generic.mobile": { icon: Smartphone, color: "#64748b" },
  "generic.api": { icon: Server, color: "#2563eb" },
  "generic.database": { icon: Database, color: "#16a34a" },
  "generic.queue": { icon: ListOrdered, color: "#d97706" },
  "generic.lock": { icon: Lock, color: "#dc2626" },
  // Tools — brand logos.
  "tools.slack": { icon: MessageSquare, color: "#7c3aed", svg: "/icons/tools/slack.svg" },
  "tools.jira": { icon: Ticket, color: "#2563eb", svg: "/icons/tools/jira.svg" },
  "tools.teams": { icon: Users, color: "#7c3aed", svg: "/icons/tools/teams.svg" },
  "tools.zoom": { icon: Video, color: "#2563eb", svg: "/icons/tools/zoom.svg" },
  "tools.outlook": { icon: Mail, color: "#0891b2", svg: "/icons/tools/outlook.svg" },
};

/** Lucide glyphs for non-service node types (structure / shapes), used by the palette. */
const GLYPHS: Record<string, { icon: LucideIcon; color: string }> = {
  group: { icon: Frame, color: "#64748b" },
  text: { icon: Type, color: "#64748b" },
  "shape.rectangle": { icon: Square, color: "#64748b" },
  "shape.rounded": { icon: Square, color: "#64748b" },
  "shape.circle": { icon: Circle, color: "#64748b" },
  "shape.diamond": { icon: Diamond, color: "#64748b" },
  "shape.cylinder": { icon: Cylinder, color: "#64748b" },
  "shape.hexagon": { icon: Hexagon, color: "#64748b" },
  "shape.parallelogram": { icon: RectangleHorizontal, color: "#64748b" },
  "shape.triangle": { icon: Triangle, color: "#64748b" },
  "shape.note": { icon: StickyNote, color: "#64748b" },
};

export function iconFor(type: string): IconDef {
  return ICON_MAP[type] ?? GLYPHS[type] ?? { icon: Box, color: "#64748b" };
}

/** Service/brand icon node types, for the type picker in the inspector. */
export const ICON_TYPE_OPTIONS = Object.keys(ICON_MAP).map((value) => ({ value, label: value }));
// Back-compat alias.
export const NODE_TYPE_OPTIONS = ICON_TYPE_OPTIONS;

/* ── Shape / text / group node families ─────────────────────────────────── */

export type ShapeKind = "rectangle" | "rounded" | "circle" | "diamond" | "cylinder" | "hexagon" | "parallelogram" | "triangle" | "note";

export const SHAPE_KINDS: { type: string; kind: ShapeKind; label: string }[] = [
  { type: "shape.rectangle", kind: "rectangle", label: "Rectangle" },
  { type: "shape.rounded", kind: "rounded", label: "Rounded" },
  { type: "shape.circle", kind: "circle", label: "Circle" },
  { type: "shape.diamond", kind: "diamond", label: "Decision" },
  { type: "shape.cylinder", kind: "cylinder", label: "Store" },
  { type: "shape.hexagon", kind: "hexagon", label: "Hexagon" },
  { type: "shape.parallelogram", kind: "parallelogram", label: "Data (I/O)" },
  { type: "shape.triangle", kind: "triangle", label: "Triangle" },
  { type: "shape.note", kind: "note", label: "Note" },
];

export const SHAPE_TYPE_OPTIONS = SHAPE_KINDS.map((s) => ({ value: s.type, label: s.label }));

export const EDGE_SHAPE_OPTIONS = [
  { value: "bezier", label: "Curved" },
  { value: "smooth", label: "Smoothstep" },
  { value: "step", label: "Step" },
  { value: "straight", label: "Straight" },
];

export const EDGE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

export const TEXT_TYPE = "text";
export const GROUP_TYPE = "group";

export function shapeKindOf(type: string): ShapeKind | null {
  const found = SHAPE_KINDS.find((s) => s.type === type);
  return found ? found.kind : null;
}
export const isShape = (type: string) => type.startsWith("shape.");
export const isText = (type: string) => type === TEXT_TYPE;
export const isGroup = (type: string) => type === GROUP_TYPE;
export const isIconNode = (type: string) => !isShape(type) && !isText(type) && !isGroup(type);

/** Which React Flow node renderer to use for a given diagram node type. */
export function rfTypeFor(type: string): "service" | "shape" | "text" | "group" {
  if (isGroup(type)) return "group";
  if (isText(type)) return "text";
  if (isShape(type)) return "shape";
  return "service";
}

/** Categorized palette for the editor sidebar. */
export const PALETTE: { category: string; items: { type: string; label: string }[] }[] = [
  {
    category: "Structure",
    items: [
      { type: GROUP_TYPE, label: "Group / container" },
      { type: TEXT_TYPE, label: "Text label" },
    ],
  },
  { category: "Shapes", items: SHAPE_KINDS.map((s) => ({ type: s.type, label: s.label })) },
  {
    category: "Generic",
    items: [
      { type: "generic.user", label: "User" },
      { type: "generic.mobile", label: "Mobile" },
      { type: "generic.api", label: "Service / API" },
      { type: "generic.database", label: "Database" },
      { type: "generic.queue", label: "Queue" },
      { type: "generic.lock", label: "Security" },
    ],
  },
  { category: "AWS", items: AWS.map((a) => ({ type: `aws.${a.file}`, label: a.label })) },
  { category: "Azure", items: AZURE.map((a) => ({ type: `azure.${a.key}`, label: a.label })) },
  {
    category: "Tools",
    items: [
      { type: "tools.slack", label: "Slack" },
      { type: "tools.jira", label: "Jira" },
      { type: "tools.teams", label: "Teams" },
      { type: "tools.zoom", label: "Zoom" },
      { type: "tools.outlook", label: "Outlook" },
    ],
  },
  ...(["Frontend", "Backend", "Database", "DevOps"] as const).map((cat) => ({
    category: cat,
    items: TECH.filter((t) => t.cat === cat).map((t) => ({ type: `tech.${t.file}`, label: t.label })),
  })),
];

/** Default label when adding a node of a given type from the palette. */
export function defaultLabelFor(type: string): string {
  if (isGroup(type)) return "Group";
  if (isText(type)) return "Text";
  const shape = SHAPE_KINDS.find((s) => s.type === type);
  if (shape) return shape.label;
  for (const cat of PALETTE) {
    const item = cat.items.find((i) => i.type === type);
    if (item) return item.label;
  }
  return "Node";
}

export function emptyDiagram(title = "Untitled diagram"): DiagramData {
  return { title, description: "", style: "default", layers: [], nodes: [], edges: [] };
}

/* ── Node → project entity links ────────────────────────────────────────── */

export const LINK_TYPES: { value: string; label: string; color: string }[] = [
  { value: "knowledge", label: "Knowledge item", color: "#2563eb" },
  { value: "risk", label: "Risk", color: "#dc2626" },
  { value: "member", label: "Member", color: "#7c3aed" },
  { value: "milestone", label: "Milestone", color: "#16a34a" },
];

export function linkTypeMeta(type?: string) {
  return LINK_TYPES.find((t) => t.value === type) ?? LINK_TYPES[0];
}

/** Where clicking a linked entity should navigate within the project. */
export function linkHref(projectId: string, link: DLink): string {
  if (link.type === "knowledge") return `/projects/${projectId}/transcripts`;
  return `/projects/${projectId}`;
}

/* ── Diagram kinds (type picker, badges, templates) ─────────────────────── */

export type DiagramKind = "architecture" | "flowchart" | "dfd" | "erd" | "mindmap" | "sequence" | "gantt" | "state";

/** Text-based kinds rendered with Mermaid rather than the React Flow canvas. */
export const MERMAID_KINDS: DiagramKind[] = ["sequence", "gantt", "state"];
export const isMermaidKind = (kind?: string): boolean => MERMAID_KINDS.includes(kind as DiagramKind);

export const DIAGRAM_KINDS: { value: DiagramKind; label: string; description: string; color: string; icon: LucideIcon }[] = [
  { value: "architecture", label: "Architecture", description: "Cloud / system components & connections", color: "#2563eb", icon: Network },
  { value: "flowchart", label: "Flowchart", description: "Process steps, decisions & branches", color: "#16a34a", icon: Workflow },
  { value: "dfd", label: "Data Flow", description: "Processes, data stores & flows", color: "#d97706", icon: Share2 },
  { value: "erd", label: "ER Diagram", description: "Entities, fields & relationships", color: "#7c3aed", icon: Database },
  { value: "mindmap", label: "Mind Map", description: "Central topic & branches", color: "#db2777", icon: GitBranch },
  { value: "sequence", label: "Sequence", description: "Time-ordered interactions (Mermaid)", color: "#0891b2", icon: ArrowRightLeft },
  { value: "gantt", label: "Gantt / Timeline", description: "Tasks across dates (Mermaid)", color: "#ca8a04", icon: CalendarClock },
  { value: "state", label: "State Machine", description: "States & transitions (Mermaid)", color: "#dc2626", icon: Activity },
];

export function kindMeta(kind?: string) {
  return DIAGRAM_KINDS.find((k) => k.value === kind) ?? DIAGRAM_KINDS[0];
}

/** Starter Mermaid source per text-based kind. */
export function mermaidTemplate(kind: string): string {
  switch (kind) {
    case "gantt":
      return `gantt
    title Project Plan
    dateFormat YYYY-MM-DD
    section Phase 1
    Design        :a1, 2026-06-01, 7d
    Build         :after a1, 14d
    section Phase 2
    Test          :2026-07-01, 7d
    Launch        :milestone, 2026-07-10, 0d`;
    case "state":
      return `stateDiagram-v2
    [*] --> Draft
    Draft --> Review
    Review --> Approved: sign-off
    Review --> Draft: changes
    Approved --> [*]`;
    default: // sequence
      return `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database
    U->>A: Request
    A->>D: Query
    D-->>A: Result
    A-->>U: Response`;
  }
}

/** Starter content for a blank diagram of a given kind. */
export function templateFor(kind: string, title: string): DiagramData {
  const d = emptyDiagram(title);
  if (isMermaidKind(kind)) {
    d.mermaid = mermaidTemplate(kind);
    return d;
  }
  switch (kind) {
    case "flowchart":
      d.nodes = [
        { id: "s", type: "shape.rounded", label: "Start", x: 220, y: 40, width: 120, height: 54, color: "#16a34a" },
        { id: "p", type: "shape.rectangle", label: "Process step", x: 215, y: 150, width: 130, height: 60 },
        { id: "dec", type: "shape.diamond", label: "Decision?", x: 210, y: 290, width: 140, height: 92, color: "#d97706" },
        { id: "e", type: "shape.rounded", label: "End", x: 220, y: 450, width: 120, height: 54, color: "#dc2626" },
      ];
      d.edges = [
        { id: "e1", from: "s", to: "p", style: "solid", shape: "smooth" },
        { id: "e2", from: "p", to: "dec", style: "solid", shape: "smooth" },
        { id: "e3", from: "dec", to: "e", label: "Yes", style: "solid", shape: "smooth" },
      ];
      break;
    case "dfd":
      d.nodes = [
        { id: "ext", type: "shape.rectangle", label: "External Entity", x: 60, y: 120, width: 140, height: 60 },
        { id: "proc", type: "shape.circle", label: "Process", x: 320, y: 110, width: 110, height: 110, color: "#d97706" },
        { id: "store", type: "shape.cylinder", label: "Data Store", x: 320, y: 300, width: 140, height: 70, color: "#16a34a" },
      ];
      d.edges = [
        { id: "e1", from: "ext", to: "proc", label: "request", style: "solid", shape: "smooth" },
        { id: "e2", from: "proc", to: "store", label: "record", style: "solid", shape: "smooth" },
      ];
      break;
    case "erd":
      d.nodes = [
        { id: "a", type: "shape.rectangle", label: "Customer\n- id (PK)\n- name\n- email", x: 80, y: 80, width: 180, height: 110, color: "#7c3aed" },
        { id: "b", type: "shape.rectangle", label: "Order\n- id (PK)\n- total\n- customerId (FK)", x: 360, y: 80, width: 190, height: 120, color: "#7c3aed" },
      ];
      d.edges = [{ id: "e1", from: "a", to: "b", label: "1:N", style: "solid", shape: "smooth" }];
      break;
    case "mindmap":
      d.nodes = [
        { id: "c", type: "shape.rounded", label: "Central Topic", x: 280, y: 200, width: 150, height: 60, color: "#db2777" },
        { id: "b1", type: "shape.rounded", label: "Branch 1", x: 60, y: 80, width: 120, height: 50, color: "#2563eb" },
        { id: "b2", type: "shape.rounded", label: "Branch 2", x: 60, y: 320, width: 120, height: 50, color: "#16a34a" },
        { id: "b3", type: "shape.rounded", label: "Branch 3", x: 540, y: 200, width: 120, height: 50, color: "#d97706" },
      ];
      d.edges = [
        { id: "e1", from: "c", to: "b1", style: "solid", shape: "bezier" },
        { id: "e2", from: "c", to: "b2", style: "solid", shape: "bezier" },
        { id: "e3", from: "c", to: "b3", style: "solid", shape: "bezier" },
      ];
      break;
    // architecture starts empty — users generate or build from the palette.
  }
  return d;
}
