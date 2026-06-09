import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000; // re-scan every 6h
const BOOT_DELAY_MS = 20 * 1000; // let the app settle before the first scan
const DAY = 24 * 60 * 60 * 1000;

type Desired = {
  dedupeKey: string;
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail?: string;
  suggestedAction?: string;
};

/**
 * The proactive layer: detects, on a schedule, the things a manager should be
 * told about a project WITHOUT having to ask — overdue milestones, unmitigated
 * high risks, approvals piling up, stale projects, transcripts stuck unprocessed.
 *
 * Detection is deterministic (no LLM) so it's reliable and grounded. Each signal
 * has a stable dedupeKey: re-scanning updates the same row, the condition
 * clearing auto-resolves it (status DONE), and a user dismissal sticks.
 */
@Injectable()
export class ProactiveService implements OnModuleInit {
  private readonly logger = new Logger(ProactiveService.name);

  constructor(private readonly prisma: PrismaClient) {}

  onModuleInit() {
    setTimeout(() => {
      this.scanAllOrgs().catch((e) => this.logger.error(`Initial scan failed: ${e?.message ?? e}`));
    }, BOOT_DELAY_MS).unref?.();
    setInterval(() => {
      this.scanAllOrgs().catch((e) => this.logger.error(`Scheduled scan failed: ${e?.message ?? e}`));
    }, SCAN_INTERVAL_MS).unref?.();
  }

  /** Scan every organization that has projects. */
  async scanAllOrgs() {
    const orgs = await this.prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      distinct: ["organizationId"],
      select: { organizationId: true },
    });
    for (const { organizationId } of orgs) {
      await this.scan(organizationId).catch((e) =>
        this.logger.error(`Scan for ${organizationId} failed: ${e?.message ?? e}`),
      );
    }
  }

  /** Detect signals for one org and reconcile them against stored insights. */
  async scan(organizationId: string): Promise<{ open: number }> {
    const now = Date.now();

    const projects = await this.prisma.project.findMany({
      where: { organizationId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        status: true,
        milestones: { where: { status: { notIn: ["done", "completed"] } }, select: { id: true, name: true, dueDate: true } },
        risks: { where: { status: "open" }, select: { id: true, title: true, severity: true, mitigationPlan: true } },
      },
    });
    if (!projects.length) return { open: 0 };

    const projectIds = projects.map((p) => p.id);
    const [pendingByProject, latestByProject, stuck] = await Promise.all([
      this.prisma.recommendation.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds }, status: "PENDING" }, _count: { _all: true } }),
      this.prisma.meetingTranscript.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _max: { occurredAt: true } }),
      this.prisma.meetingTranscript.findMany({ where: { projectId: { in: projectIds }, processedAt: null, createdAt: { lt: new Date(now - 60 * 60 * 1000) } }, select: { id: true, projectId: true, title: true } }),
    ]);
    const pendingMap = new Map(pendingByProject.map((r) => [r.projectId, r._count._all]));
    const latestMap = new Map(latestByProject.map((r) => [r.projectId, r._max.occurredAt]));
    const stuckByProject = new Map<string, { id: string; title: string }[]>();
    for (const s of stuck) {
      const arr = stuckByProject.get(s.projectId) ?? [];
      arr.push({ id: s.id, title: s.title });
      stuckByProject.set(s.projectId, arr);
    }

    let totalOpen = 0;
    for (const p of projects) {
      const desired: Desired[] = [];

      if (p.status === "AT_RISK") {
        desired.push({
          dedupeKey: "AT_RISK_STATUS",
          kind: "AT_RISK_STATUS",
          severity: "high",
          title: `${p.name} is marked at-risk`,
          detail: "This project's status is AT_RISK.",
          suggestedAction: "Review what's driving it and add a mitigation, or update the status if it's recovered.",
        });
      }

      for (const m of p.milestones) {
        if (!m.dueDate) continue;
        const due = m.dueDate.getTime();
        if (due < now) {
          const days = Math.floor((now - due) / DAY);
          desired.push({
            dedupeKey: `OVERDUE_MILESTONE:${m.id}`,
            kind: "OVERDUE_MILESTONE",
            severity: "high",
            title: `Milestone overdue: ${m.name}`,
            detail: `Was due ${m.dueDate.toISOString().slice(0, 10)} (${days} day${days === 1 ? "" : "s"} ago) and isn't done.`,
            suggestedAction: "Re-plan the date, or mark it done if it's complete.",
          });
        } else if (due - now <= 3 * DAY) {
          desired.push({
            dedupeKey: `MILESTONE_DUE_SOON:${m.id}`,
            kind: "MILESTONE_DUE_SOON",
            severity: "medium",
            title: `Milestone due soon: ${m.name}`,
            detail: `Due ${m.dueDate.toISOString().slice(0, 10)}.`,
            suggestedAction: "Confirm it's on track or flag a risk if it isn't.",
          });
        }
      }

      for (const r of p.risks) {
        if (r.severity === "high" && !r.mitigationPlan) {
          desired.push({
            dedupeKey: `UNMITIGATED_HIGH_RISK:${r.id}`,
            kind: "UNMITIGATED_HIGH_RISK",
            severity: "high",
            title: `High risk has no mitigation: ${r.title}`,
            detail: "A high-severity risk is open with no mitigation plan.",
            suggestedAction: "Add a mitigation plan, or ask the agent to draft one.",
          });
        }
      }

      const pending = pendingMap.get(p.id) ?? 0;
      if (pending >= 3) {
        desired.push({
          dedupeKey: "PENDING_APPROVALS",
          kind: "PENDING_APPROVALS",
          severity: "medium",
          title: `${pending} recommendations awaiting your approval`,
          detail: `${p.name} has ${pending} pending recommendations.`,
          suggestedAction: "Work through the approval queue on the project.",
        });
      }

      // Stale: had meetings before, but none in the last 14 days (skip brand-new projects).
      const latest = latestMap.get(p.id) ?? null;
      if (p.status === "ACTIVE" && latest && now - latest.getTime() > 14 * DAY) {
        const days = Math.floor((now - latest.getTime()) / DAY);
        desired.push({
          dedupeKey: "STALE_PROJECT",
          kind: "STALE_PROJECT",
          severity: "low",
          title: `No meeting activity in ${days} days`,
          detail: `The last meeting on ${p.name} was ${latest.toISOString().slice(0, 10)}.`,
          suggestedAction: "Check in with the team, or confirm the project should still be active.",
        });
      }

      for (const s of stuckByProject.get(p.id) ?? []) {
        desired.push({
          dedupeKey: `PROCESSING_STUCK:${s.id}`,
          kind: "PROCESSING_STUCK",
          severity: "medium",
          title: `Transcript not analysed: ${s.title}`,
          detail: "This meeting was uploaded but its AI analysis hasn't completed.",
          suggestedAction: "Check AI settings (API key) — re-uploading will retry processing.",
        });
      }

      totalOpen += await this.reconcile(organizationId, p.id, desired);
    }

    return { open: totalOpen };
  }

  /** Upsert desired signals for a project and auto-resolve stale OPEN ones. */
  private async reconcile(organizationId: string, projectId: string, desired: Desired[]): Promise<number> {
    const existing = await this.prisma.proactiveInsight.findMany({ where: { projectId } });
    const byKey = new Map(existing.map((e) => [e.dedupeKey, e]));
    const desiredKeys = new Set(desired.map((d) => d.dedupeKey));
    let open = 0;

    for (const d of desired) {
      const prior = byKey.get(d.dedupeKey);
      if (prior?.status === "DISMISSED") continue; // user silenced it — respect that
      await this.prisma.proactiveInsight.upsert({
        where: { projectId_dedupeKey: { projectId, dedupeKey: d.dedupeKey } },
        create: { organizationId, projectId, status: "OPEN", ...d },
        update: { status: "OPEN", severity: d.severity, title: d.title, detail: d.detail, suggestedAction: d.suggestedAction },
      });
      open++;
    }

    // Conditions that no longer hold → resolve (but never touch dismissed rows).
    const toResolve = existing.filter((e) => e.status === "OPEN" && !desiredKeys.has(e.dedupeKey));
    if (toResolve.length) {
      await this.prisma.proactiveInsight.updateMany({
        where: { id: { in: toResolve.map((e) => e.id) } },
        data: { status: "DONE" },
      });
    }
    return open;
  }

  /** Open insights for an org, highest severity first. */
  async list(organizationId: string) {
    const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
    const rows = await this.prisma.proactiveInsight.findMany({
      where: { organizationId, status: "OPEN" },
      include: { project: { select: { id: true, name: true } } },
      take: 100,
    });
    return rows.sort((a, b) => (rank[a.severity] ?? 1) - (rank[b.severity] ?? 1) || b.createdAt.getTime() - a.createdAt.getTime());
  }

  async dismiss(id: string, organizationId: string) {
    await this.prisma.proactiveInsight.updateMany({ where: { id, organizationId }, data: { status: "DISMISSED" } });
    return { ok: true };
  }
}
