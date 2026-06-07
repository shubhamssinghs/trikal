# AI Technical Manager Command Center

Detailed product, architecture, AI-agent, MCP, and MVP implementation blueprint

Prepared for: Shubham Singh

Date: 2026-06-07

# Project Name

Trikal (AI Command Center for Technical Managers)

## 1. Executive Summary

The desired product is an AI-powered Technical Manager Command Center: a private operational dashboard for a technical software manager who has to manage stakeholders, offshore teams, meetings, timelines, tickets, project scope, technical architecture, documents, compliance boundaries, and communications across Slack, Teams, Google Meet, Zoom, email, Outlook, calendars, Jira, Azure DevOps, Granola transcripts, Google Drive, SharePoint, and other tools.

The product should not be designed as a generic chatbot. It should be designed as a project intelligence platform with AI assistance. The system should collect project signals, normalize them, organize them by company and project, maintain a project-specific knowledge base, and then use specialized AI agents to recommend next actions, generate artifacts, draft communications, summarize meetings, create tickets, update documents, and produce architecture diagrams.

The core outcome is:

```text
Login -> See today's priorities -> Open company/project -> Review project truth
-> AI recommends next actions -> User approves -> System updates tools/docs/tickets
-> Knowledge base stays current
```

For the pilot/MVP, the system should be deployed cheaply on a Dockerized Ubuntu server rather than AWS. The architecture should remain cloud-migration-ready, but the initial infrastructure should use open-source/local services: Docker Compose, Next.js, NestJS, PostgreSQL with pgvector, Redis, BullMQ, MinIO, and Caddy or Nginx.

The user intends to use Claude to build this. The recommended build approach is to use Claude Code with custom subagents, project instructions, MCP tools, and optionally experimental agent teams for parallel work. Claude should act as a structured engineering team, but the user remains product owner, architect, reviewer, and approval authority.

## 2. Product Vision

### 2.1 Problem Statement

A technical software manager's day is fragmented across many systems:

- Stakeholder conversations.
- Offshore team coordination.
- Ticket creation and project board management.
- Project timeline tracking.
- Scope creation and documentation.
- Meeting participation.
- Meeting transcript review using Granola or similar tools.
- Extracting action items from calls.
- Creating advanced system architecture diagrams, flow diagrams, and logic diagrams.
- Handling projects with different compliance needs, including some HIPAA and PIA-sensitive work.
- Monitoring messages across Slack, Teams, Google Meet, Zoom, email, Outlook email, and other tools.
- Keeping knowledge current across multiple companies, programs, and projects.

The problem is not just lack of summaries. The deeper problem is lack of operational truth. Important project context is scattered across communication channels, meetings, tickets, documents, diagrams, and personal memory.

### 2.2 Product Vision Statement

Build an AI-assisted command center that becomes the technical manager's trusted project operating layer. It should unify project signals, maintain project knowledge, recommend next actions, help draft communications, generate documents and diagrams, and keep project execution aligned with scope, timelines, compliance, and stakeholder expectations.

### 2.3 Product Principles

- The system should be project-centered, not chat-centered.
- AI should recommend and draft, but important external actions require human approval.
- Every project should have its own knowledge base.
- Company/client context should be shared across related projects.
- Compliance should be configurable per company and per project.
- Integrations should be modular connectors, not hardcoded into the product.
- Diagram generation should use structured, editable diagram data and approved icon libraries, not flat AI-generated images.
- The MVP should start with the most painful workflow: transcripts -> decisions/actions/scope -> recommendations -> tickets/docs/diagrams.
- The system should be built as a maintainable SaaS-style platform even if the pilot is private.

## 3. Target User

The primary user is a technical software manager who:

- Manages multiple software projects.
- Coordinates offshore/onshore teams.
- Communicates with stakeholders and business partners.
- Runs or participates in many meetings.
- Creates tickets, scope documents, project plans, and architecture diagrams.
- Needs to understand what needs attention today.
- Needs to maintain project history, decisions, and follow-ups.
- Sometimes works on HIPAA/PIA-sensitive projects, but not every project is compliance-sensitive.

Secondary users in the future may include:

- Program managers.
- Project managers.
- Engineering leads.
- Business analysts.
- Architects.
- Compliance reviewers.
- Offshore delivery leads.

## 4. Core Product Outcome

When the user logs in through Trishul IAM OAuth, the dashboard should answer:

- What should I focus on today?
- Which projects are at risk?
- Which stakeholder needs a reply?
- Which meetings are coming up?
- Which follow-ups are pending?
- Which tickets are blocked?
- Which scope items are unclear?
- Which project has stale documentation?
- What did we decide in the last meeting?
- What should I ask the offshore team?
- What should I tell the client?
- What documents or diagrams need to be created or updated?

The product should feel like a work command center, not a marketing page, not a chat-only assistant, and not a loose note-taking tool.

## 5. Product Hierarchy

The platform should support grouping multiple projects under one company/client.

```text
Organization
  -> Company / Client / Account
      -> Program / Portfolio
          -> Project
              -> Workstreams / Epics
```

### 5.1 Organization

Represents the top-level tenant or account. For the pilot, this can be a single organization tied to the user's Trishul IAM identity.

Responsibilities:

- User identity and access.
- Global settings.
- Shared integrations if needed.
- Global audit trail.
- Billing/license later if this becomes SaaS.

### 5.2 Company / Client / Account

Represents a client/company under which multiple projects may exist.

Example:

```text
Acme Healthcare
  -> Patient Portal Modernization
  -> Claims Automation
  -> Data Warehouse Migration
```

Company-level shared context:

- Stakeholders.
- Business goals.
- Contract/SOW.
- Shared compliance posture.
- Common documents.
- Account-level risks.
- Client communication preferences.
- Shared Slack/Teams channels if applicable.

### 5.3 Program / Portfolio

Optional grouping layer for related projects. This is useful when a company has many projects and they need a program-level view.

Examples:

- Digital Transformation Program.
- Healthcare Data Modernization.
- Mobile Platform Program.

### 5.4 Project

The central execution unit.

Project-level data:

- Timeline.
- Milestones.
- Team members.
- Stakeholders.
- Workstreams.
- Tickets.
- Meetings.
- Documents.
- Diagrams.
- Knowledge base.
- Integrations.
- Compliance profile.
- AI recommendations.

### 5.5 Workstreams / Epics

Sub-project execution areas.

Examples:

- Authentication.
- Data migration.
- API modernization.
- Reporting.
- Compliance review.
- Mobile app.
- Admin portal.

## 6. Compliance Model

Not all projects are HIPAA/PIA-sensitive. Compliance must be configurable, inherited, and overrideable.

### 6.1 Compliance Inheritance

```text
Company default compliance profile
  -> Project override
      -> Document/data classification
```

Example:

```text
Company: Healthcare Client
  Default profile: Healthcare-sensitive

Project A: Patient Records API
  HIPAA: enabled
  PIA: required
  PHI handling: strict

Project B: Public Marketing Website
  HIPAA: disabled
  PIA: not required

Project C: Internal Analytics
  HIPAA: partial review
  PIA: required
```

### 6.2 Compliance Profiles

The platform should include compliance profiles such as:

- Standard.
- Internal confidential.
- PII-sensitive.
- PHI/HIPAA-sensitive.
- PIA required.
- Financial/legal sensitive.
- Custom profile.

Each profile should control:

- Data retention.
- Audit logging level.
- AI access policy.
- Redaction policy.
- External action approval rules.
- Export restrictions.
- Allowed connectors.
- Allowed model/provider mode.

### 6.3 Data Classification

Every ingested or generated item should be classifiable:

- Public.
- Internal.
- Confidential.
- PII.
- PHI.
- Financial.
- Legal.
- Security-sensitive.

The AI should use this classification before summarizing, generating, exporting, or sending information.

### 6.4 Compliance Rule

For the MVP:

- Do not ingest real PHI in the pilot unless the infrastructure and vendor agreements are reviewed.
- Use mock or redacted data for HIPAA-sensitive experiments.
- Log AI-generated recommendations and user approvals.
- Require human approval before external communication or ticket updates.
- Keep compliance policy fields in the database from day one even if enforcement starts simple.

## 7. User Experience Flow

### 7.1 Login Flow

```text
User opens dashboard
  -> Redirect to Trishul IAM OAuth/OIDC
  -> User authenticates
  -> Backend validates identity and claims
  -> System loads organization, companies, projects, permissions
  -> User lands on Today Dashboard
```

MVP simplification:

- If Trishul IAM is not ready, start with a local OAuth/OIDC-compatible provider such as Authentik, Keycloak, or a temporary passwordless login.
- Keep the auth abstraction ready for Trishul IAM.

### 7.2 Today Dashboard Flow

The first screen should show work, not marketing.

Sections:

- Today's priorities.
- Meetings today.
- Pending follow-ups.
- Messages/emails needing response.
- Projects at risk.
- Blocked tickets.
- AI recommendations.
- Approval queue.
- Recent decisions.

The dashboard should answer: "What should I do today?"

### 7.3 Company Flow

```text
Today Dashboard
  -> Select Company / Client
  -> See company overview
  -> See all projects under the company
  -> See shared stakeholders, risks, documents, and compliance defaults
```

Company page should include:

- Company summary.
- Active projects.
- Key stakeholders.
- Shared risks.
- Recent activity.
- Compliance defaults.
- Shared integrations.
- Cross-project recommendations.

### 7.4 Project Flow

```text
Company page
  -> Open project
  -> See project health
  -> Review timeline, tickets, meetings, docs, diagrams, risks
  -> Ask project AI assistant
  -> Approve recommended actions
```

Project page should include:

- Project status and health.
- Timeline and milestones.
- Risks/blockers.
- Stakeholders.
- Team members.
- Tickets.
- Meetings.
- Knowledge base.
- Documents.
- Diagrams.
- Integrations.
- Compliance profile.
- AI recommendations.

### 7.5 Project Creation Flow

```text
Create Project
  -> Select company/client
  -> Enter project name and summary
  -> Add stakeholders/team
  -> Define timeline/milestones
  -> Select compliance profile
  -> Connect integrations
  -> Create initial knowledge base
  -> Generate first project brief
```

Project creation fields:

- Project name.
- Company/client.
- Program/portfolio.
- Description.
- Start date.
- Target end date.
- Stakeholders.
- Offshore team.
- Internal team.
- Compliance profile.
- Ticket system.
- Communication channels.
- Calendar source.
- Document source.
- Transcript source.

### 7.6 Transcript-to-Action Flow

This should be the first killer MVP workflow.

```text
Upload/import Granola transcript
  -> Select company/project
  -> AI extracts meeting summary
  -> AI extracts decisions
  -> AI extracts action items
  -> AI identifies owners and due dates
  -> AI suggests tickets/docs/follow-ups
  -> User reviews
  -> User approves actions
  -> System updates knowledge base
```

Outputs:

- Meeting summary.
- Decisions.
- Action items.
- Open questions.
- Risks/blockers.
- Scope changes.
- Ticket suggestions.
- Follow-up email drafts.
- Project timeline impact.

### 7.7 Message/Email Recommendation Flow

```text
New message/email ingested
  -> Normalize event
  -> Attach to company/project if possible
  -> AI classifies importance
  -> AI suggests response/action
  -> User reviews
  -> User approves or edits
  -> System sends reply or records decision
```

For MVP, keep this read-only or manual import until connectors are mature.

### 7.8 Ticket Management Flow

```text
AI identifies action item
  -> Suggest Jira/Azure DevOps ticket
  -> User reviews title, description, acceptance criteria, priority
  -> User approves
  -> System creates/updates ticket
  -> Ticket link stored in project knowledge base
```

Ticket data should include:

- Title.
- Description.
- Acceptance criteria.
- Owner.
- Priority.
- Sprint/milestone.
- Due date.
- Source meeting/message.
- Linked project/workstream.

### 7.9 Diagram Generation Flow

```text
User requests architecture/flow/logic diagram
  -> AI reads project knowledge base
  -> AI creates structured diagram model
  -> Renderer maps component types to approved icons
  -> User edits/reviews
  -> Export to PNG/SVG/PDF/Draw.io/Confluence
```

AI should not invent logos or AWS/Azure/GCP icons. The app should manage a controlled icon registry.

## 8. High-Level Architecture

```text
External Tools
Slack / Teams / Email / Jira / Azure DevOps / Calendar / Granola / Docs
        |
        v
Connector Layer
        |
        v
Ingestion & Normalization
        |
        v
Normalized Event Store
        |
        v
Project Metadata + Knowledge Base
        |
        v
AI Agent Layer
        |
        v
Dashboard / Recommendations / Draft Actions
        |
        v
Human Approval
        |
        v
External Updates
```

### 8.1 Core Layers

Layer 1: Identity and access

- Trishul IAM OAuth/OIDC.
- RBAC.
- Project-level permissions.
- Audit logs.

Layer 2: Project data model

- Organization, company, program, project, workstream.
- Stakeholders and team.
- Timelines, milestones, risks.

Layer 3: Integration connectors

- Slack.
- Teams.
- Gmail/Outlook.
- Calendar.
- Jira/Azure DevOps.
- Zoom/Google Meet.
- Granola transcripts.
- Google Drive/SharePoint.

Layer 4: Ingestion and normalization

- Turn external events into a common internal event schema.
- Classify source type, project, company, confidence, and sensitivity.

Layer 5: Knowledge base

- Store raw documents/transcripts.
- Chunk text.
- Generate embeddings.
- Store structured extraction results.
- Support project-specific semantic search.

Layer 6: AI agent layer

- Daily briefing.
- Meeting analysis.
- Scope generation.
- Ticket recommendations.
- Communication drafting.
- Risk and timeline analysis.
- Diagram generation.
- Compliance review.

Layer 7: Human approval and action execution

- User approves before external writes.
- All approvals logged.
- External tools updated through connector actions.

## 9. MVP Deployment Architecture on Ubuntu

The pilot should avoid AWS cost. Use Docker Compose on a single Ubuntu server.

```text
Ubuntu Server
  -> Docker Compose
      -> web: Next.js
      -> api: NestJS
      -> worker: BullMQ workers
      -> postgres: PostgreSQL + pgvector
      -> redis: queue/cache
      -> minio: object storage
      -> caddy: reverse proxy + HTTPS
```

### 9.1 MVP Service Mapping

```text
AWS RDS        -> PostgreSQL container
AWS S3         -> MinIO
AWS Redis      -> Redis container
AWS ECS        -> Docker Compose
AWS Secrets    -> Docker secrets / .env initially
AWS CloudWatch -> Docker logs, later Grafana + Loki
AWS KMS        -> application-managed encryption key initially
```

### 9.2 Docker Compose Services

Required:

- `web`
- `api`
- `worker`
- `postgres`
- `redis`
- `minio`
- `caddy`

Optional later:

- `grafana`
- `loki`
- `prometheus`
- `adminer` or `pgadmin` for development only

### 9.3 Network Flow

```text
Browser
  -> Caddy HTTPS
      -> Next.js web
      -> NestJS API
          -> PostgreSQL + pgvector
          -> Redis
          -> MinIO
          -> Worker
          -> External APIs
```

### 9.4 Pilot Security Rules

- Use HTTPS with Caddy.
- Store secrets in `.env` only for pilot; move to Docker secrets or Vault later.
- Restrict server SSH access.
- Use firewall rules.
- Back up Postgres and MinIO.
- Never commit real secrets.
- Use read-only database users for MCP database inspection.
- Keep external write actions behind explicit user approval.

## 10. Recommended Tech Stack

### 10.1 Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui or Radix UI.
- TanStack Query.
- React Hook Form + Zod.
- React Flow for diagram editor MVP.
- Custom SVG renderer later for polished architecture diagrams.

### 10.2 Backend

- NestJS.
- TypeScript.
- PostgreSQL.
- Prisma ORM.
- pgvector.
- Redis.
- BullMQ.
- WebSockets or Server-Sent Events for live updates.

### 10.3 AI

- Claude API for agentic reasoning if using Anthropic directly.
- Claude Code for building the product.
- Project-specific RAG.
- Structured JSON outputs.
- Human approval workflow.
- Prompt/version management.
- Agent trace/audit table.

### 10.4 Storage

- PostgreSQL for structured records.
- pgvector for embeddings.
- MinIO for files, transcripts, exports, generated documents, diagrams, and attachments.
- Redis for queues, cache, and short-lived coordination.

### 10.5 Deployment

- Ubuntu 20.04+ or newer.
- Docker Engine.
- Docker Compose.
- Caddy or Nginx.
- GitHub repository.
- CI later using GitHub Actions.

### 10.6 Future Cloud Migration

The MVP should be portable to cloud later:

- Postgres -> AWS RDS/Azure PostgreSQL/GCP Cloud SQL.
- MinIO -> S3/Azure Blob/GCS.
- Redis -> ElastiCache/Azure Cache.
- Docker Compose -> ECS, Kubernetes, or managed container apps.
- Caddy -> ALB/CloudFront or managed ingress.

## 11. Recommended Monorepo Structure

```text
trishul-command-center/
  apps/
    web/
      Next.js dashboard
    api/
      NestJS backend API
    worker/
      Background jobs and AI processing

  packages/
    database/
      Prisma schema, migrations, seed scripts
    auth/
      Trishul IAM/OIDC, RBAC, permission helpers
    integrations/
      Connector interfaces and shared event schemas
    ai/
      Agent prompts, RAG logic, structured output schemas
    diagram/
      Diagram schema, icon registry, renderer helpers
    compliance/
      Profiles, redaction, audit helpers
    shared/
      Types, Zod schemas, constants
    ui/
      Shared UI components

  infrastructure/
    docker/
      Dockerfiles
    compose/
      docker-compose.yml
      docker-compose.dev.yml
    caddy/
      Caddyfile

  docs/
    product/
      PRD, flows, backlog
    architecture/
      diagrams, ADRs
    compliance/
      data policies and risk notes
    operations/
      deployment and backup runbooks

  .claude/
    agents/
      custom Claude subagents
    settings.json

  .mcp.json
  CLAUDE.md
  package.json
  pnpm-workspace.yaml
  turbo.json
  README.md
```

## 12. Backend Modules

### 12.1 Auth Module

Responsibilities:

- OAuth/OIDC login.
- JWT/session management.
- User profile sync.
- Role and permission resolution.
- Project access checks.

Entities:

- User.
- Organization.
- Role.
- Permission.
- Session.
- Audit event.

### 12.2 Company Module

Responsibilities:

- Create/update companies.
- Manage company stakeholders.
- Store company-level context.
- Set default compliance profile.
- View company project portfolio.

### 12.3 Project Module

Responsibilities:

- Create/update projects.
- Manage status, timeline, milestones.
- Link team members/stakeholders.
- Attach integrations.
- Provide project dashboard data.

### 12.4 Integration Module

Responsibilities:

- Store connector configuration.
- Manage OAuth tokens.
- Schedule sync jobs.
- Normalize external events.
- Track sync status and errors.

### 12.5 Knowledge Base Module

Responsibilities:

- Store source items.
- Chunk content.
- Generate embeddings.
- Support project-scoped search.
- Track data classification.
- Link generated insights back to sources.

### 12.6 AI Agent Module

Responsibilities:

- Run specialized AI workflows.
- Execute RAG queries.
- Produce structured outputs.
- Store AI runs, inputs, outputs, and citations.
- Respect compliance policies.

### 12.7 Recommendation Module

Responsibilities:

- Store recommended actions.
- Track status: new, reviewed, approved, rejected, completed.
- Link actions to projects, tickets, messages, docs, or meetings.

### 12.8 Document Module

Responsibilities:

- Generate scope documents.
- Generate meeting summaries.
- Generate project briefs.
- Export DOCX/PDF/Markdown.
- Link docs to project knowledge base.

### 12.9 Diagram Module

Responsibilities:

- Store diagram JSON.
- Manage nodes, edges, layers, and icons.
- Render SVG/PNG/PDF.
- Export Draw.io later.
- Maintain icon registry.

### 12.10 Compliance Module

Responsibilities:

- Define compliance profiles.
- Classify data.
- Redact sensitive content.
- Enforce AI and export policy.
- Record approvals and audit logs.

### 12.11 Audit Module

Responsibilities:

- Record login.
- Record connector sync.
- Record AI access to sensitive data.
- Record external actions.
- Record approvals/rejections.

### 12.12 Notification Module

Responsibilities:

- Notify user about urgent recommendations.
- Send in-app notifications.
- Later: email/Slack notification support.

## 13. Data Model

### 13.1 Core Tables

```text
users
organizations
companies
programs
projects
workstreams
stakeholders
team_members
roles
permissions
memberships
```

### 13.2 Project Execution Tables

```text
milestones
risks
blockers
tasks
recommendations
approval_requests
decisions
action_items
```

### 13.3 Integration Tables

```text
integrations
integration_accounts
sync_runs
external_events
external_id_map
webhook_events
```

### 13.4 Knowledge Base Tables

```text
knowledge_items
knowledge_chunks
knowledge_embeddings
source_documents
meeting_transcripts
message_threads
document_versions
```

### 13.5 AI Tables

```text
ai_runs
ai_run_sources
ai_outputs
agent_configs
prompt_versions
tool_calls
```

### 13.6 Diagram Tables

```text
diagrams
diagram_versions
diagram_nodes
diagram_edges
icon_registry
diagram_exports
```

### 13.7 Compliance Tables

```text
compliance_profiles
data_classifications
redaction_rules
audit_logs
retention_policies
```

## 14. Normalized Event Model

All external integrations should convert data into a common event model.

```json
{
  "id": "evt_123",
  "organizationId": "org_1",
  "companyId": "company_1",
  "projectId": "project_1",
  "source": "slack",
  "sourceType": "message",
  "externalId": "slack_ts_123",
  "title": "Stakeholder asked about timeline",
  "body": "Can we confirm delivery date for phase 2?",
  "author": {
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "occurredAt": "2026-06-07T10:30:00Z",
  "classification": "confidential",
  "metadata": {
    "channel": "project-alpha",
    "threadId": "abc"
  }
}
```

This allows every connector to plug into the same ingestion and AI pipeline.

## 15. Integration Strategy

### 15.1 Connector Interface

Each integration should implement a common connector interface.

```ts
interface Connector {
  type: ConnectorType;
  connect(config: ConnectorConfig): Promise<ConnectionResult>;
  sync(context: SyncContext): Promise<SyncResult>;
  normalize(raw: unknown): Promise<NormalizedEvent[]>;
  executeAction(action: ExternalAction): Promise<ActionResult>;
  disconnect(integrationId: string): Promise<void>;
}
```

### 15.2 Initial Connector Priority

MVP:

- Manual transcript upload.
- Manual document upload.
- Manual ticket import/export CSV if needed.

Phase 2:

- Jira.
- Azure DevOps.
- Calendar.

Phase 3:

- Email/Outlook via Microsoft Graph.
- Gmail/Google Workspace.

Phase 4:

- Slack.
- Teams.
- Zoom/Google Meet.
- Granola direct import if API/export is available.

Phase 5:

- Google Drive.
- SharePoint.
- Confluence.

### 15.3 Read Before Write

All connectors should start read-only where possible.

External write actions should require approval:

- Send email.
- Post Slack/Teams message.
- Create/update Jira ticket.
- Create/update Azure DevOps work item.
- Publish document.
- Publish diagram.

## 16. AI Agent Layer in the Product

The product should have specialized runtime AI agents. These are not the same as Claude Code build agents. Runtime agents are product features used by the dashboard.

### 16.1 Daily Briefing Agent

Purpose:

- Summarize what the user should focus on today.

Inputs:

- Calendar.
- Project timelines.
- Recommendations.
- Messages/emails.
- Tickets.
- Risks/blockers.

Outputs:

- Today's top priorities.
- Meetings needing preparation.
- Follow-ups due.
- At-risk projects.
- Suggested time blocks.

### 16.2 Meeting Transcript Agent

Purpose:

- Convert Granola/meeting transcripts into structured project knowledge.

Outputs:

- Summary.
- Decisions.
- Action items.
- Owners.
- Due dates.
- Open questions.
- Risks.
- Scope changes.
- Suggested tickets.

### 16.3 Risk and Timeline Agent

Purpose:

- Detect timeline slips, blockers, stale tickets, missing owners, and project risk.

Outputs:

- Risk list.
- Severity.
- Evidence.
- Suggested mitigation.
- Stakeholder communication draft.

### 16.4 Ticket Agent

Purpose:

- Suggest, create, and update tickets.

Outputs:

- Ticket title.
- Description.
- Acceptance criteria.
- Priority.
- Workstream.
- Linked source.

### 16.5 Communication Agent

Purpose:

- Draft replies and follow-ups.

Outputs:

- Email draft.
- Slack/Teams reply draft.
- Stakeholder status update.
- Offshore handoff message.

### 16.6 Scope and Requirement Agent

Purpose:

- Convert discussions into scope and requirements.

Outputs:

- Functional requirements.
- Non-functional requirements.
- Assumptions.
- Out of scope items.
- Acceptance criteria.
- Dependency list.

### 16.7 Architecture Diagram Agent

Purpose:

- Generate editable technical diagrams.

Outputs:

- Diagram JSON.
- Nodes.
- Edges.
- Layers.
- Icon types.
- Export-ready diagram.

### 16.8 Compliance Review Agent

Purpose:

- Check generated content and project data against compliance profile.

Outputs:

- Sensitive data warnings.
- Missing compliance controls.
- PIA/HIPAA notes.
- Redaction suggestions.
- Approval requirements.

## 17. Diagram Generation System

### 17.1 Key Principle

AI should decide what belongs in the diagram. The renderer should decide how it looks.

```text
AI output:
  component.type = "aws.s3"

Renderer:
  looks up "aws.s3" in icon registry
  uses approved SVG icon
  places node in correct layer
```

### 17.2 Why Not Use AI Image Generation for Final Diagrams

AI image generation can create attractive concept images, but it is weak for professional architecture diagrams because:

- Text may be wrong.
- Icons may be fake or inconsistent.
- Diagrams are hard to edit.
- Compliance accuracy is hard to verify.
- It does not produce maintainable architecture artifacts.

Use image generation only for concept visuals. Use structured diagrams for final work.

### 17.3 Diagram Data Model

```json
{
  "title": "Secure Healthcare Application Architecture",
  "style": "aws-layered-security",
  "layers": [
    { "id": "clients", "label": "Clients / Users" },
    { "id": "edge", "label": "Edge & Security" },
    { "id": "app", "label": "Application Layer" },
    { "id": "data", "label": "Data & Messaging" },
    { "id": "monitoring", "label": "Monitoring & Audit" }
  ],
  "nodes": [
    {
      "id": "cloudfront",
      "type": "aws.cloudfront",
      "label": "Amazon CloudFront",
      "layer": "edge"
    }
  ],
  "edges": [
    {
      "from": "cloudfront",
      "to": "waf",
      "label": "HTTPS / TLS 1.2+"
    }
  ]
}
```

### 17.4 Icon Registry

The app should manage official/approved icons:

```text
assets/icons/
  aws/
    cloudfront.svg
    waf.svg
    ecs.svg
    rds-aurora.svg
    s3.svg
    kms.svg
  azure/
    devops.svg
    app-service.svg
    sql-database.svg
  tools/
    slack.svg
    jira.svg
    teams.svg
    zoom.svg
    outlook.svg
  generic/
    user.svg
    mobile-app.svg
    database.svg
    lock.svg
```

Registry example:

```json
{
  "aws.s3": {
    "name": "Amazon S3",
    "icon": "/icons/aws/s3.svg",
    "category": "storage",
    "provider": "aws"
  },
  "generic.lock": {
    "name": "Security Control",
    "icon": "/icons/generic/lock.svg",
    "category": "security",
    "provider": "generic"
  }
}
```

### 17.5 Diagram MVP

MVP should support:

- Diagram JSON schema.
- React Flow renderer.
- Layered layout.
- Manual node movement.
- Approved icon registry.
- Export to SVG/PNG.
- Save diagram version.

Later:

- Custom polished SVG renderer.
- ELK.js/Dagre auto layout.
- Draw.io export.
- Confluence export.
- AWS/Azure/GCP diagram templates.

## 18. Claude-Based Build Strategy

The user intends to use Claude rather than freelancers. This is feasible for the MVP if the work is managed like an AI engineering team.

### 18.1 Recommended Claude Tooling

- Claude Code for implementation.
- Claude custom subagents for specialized roles.
- Claude MCP for connecting tools like GitHub, Jira, Postgres, browser automation, docs, and design assets.
- Claude agent teams for parallel Claude Code sessions only when work is naturally parallel.
- Git branches/worktrees for isolated implementation.

### 18.2 Important Distinction

There are two different agent categories:

1. Build agents: Claude Code agents that help build this software.
2. Product runtime agents: AI agents inside the dashboard after the product is built.

Do not mix these in architecture or naming.

### 18.3 Recommended Number of Claude Build Agents

Use 10 named Claude build agents. Not all should run at once.

Core agents:

1. Product Strategist Agent.
2. Solution Architect Agent.
3. Backend API Agent.
4. Frontend UX Agent.
5. Database Agent.
6. AI/RAG Agent.
7. Integration Agent.
8. Diagram System Agent.
9. DevOps Agent.
10. Security/Compliance QA Agent.

Optional later:

- Documentation Agent.
- Test Automation Agent.
- Performance Agent.
- Accessibility Agent.

### 18.4 When to Run Agents in Parallel

Good parallel work:

- Architecture review.
- Requirements analysis.
- Security review.
- Data model review.
- UI exploration.
- Independent module implementation.
- Test coverage review.

Avoid parallel work when:

- Multiple agents edit the same files.
- Database schema is changing rapidly.
- Auth/security code is being implemented.
- Requirements are still unclear.
- One task depends tightly on another.

### 18.5 Recommended Claude Work Mode

Use this pattern:

```text
One lead Claude session
  -> coordinates plan and decisions
  -> spawns subagents for research/review
  -> uses worktrees/branches for isolated implementation
  -> asks user for approval at major checkpoints
```

## 19. Claude Subagent Structure

Project-level subagents should live here:

```text
.claude/agents/
  product-strategist.md
  solution-architect.md
  backend-api.md
  frontend-ux.md
  database.md
  ai-rag.md
  integration.md
  diagram-system.md
  devops.md
  security-compliance-qa.md
```

Claude Code official docs state that subagents are specialized assistants that run in their own context windows with custom prompts, specific tool access, and independent permissions. Subagents are useful for preserving main context and enforcing focused behavior. See: https://code.claude.com/docs/en/sub-agents

### 19.1 Product Strategist Agent

File:

```text
.claude/agents/product-strategist.md
```

Purpose:

- Maintain product vision.
- Convert conversations into requirements.
- Create PRD, backlog, user stories, and acceptance criteria.
- Protect the MVP from becoming too broad.

Tools:

- Read/write docs.
- No database write.
- No production secrets.

Prompt:

```markdown
---
name: product-strategist
description: Converts business vision into product requirements, MVP scope, workflows, user stories, and acceptance criteria.
tools: Read, Write, Edit, Grep, Glob
---

You are the Product Strategist for the AI Technical Manager Command Center.
Preserve the product vision: a project-centered AI work command dashboard for a technical software manager.
Keep scope disciplined. Prefer MVP workflows that prove value quickly.
Create clear requirements, user stories, acceptance criteria, and release phases.
Do not invent integrations as completed unless they are implemented.
Flag ambiguity and propose conservative defaults.
```

### 19.2 Solution Architect Agent

Purpose:

- Own architecture consistency.
- Review service boundaries.
- Define module interactions.
- Produce ADRs and high-level diagrams.

Prompt:

```markdown
---
name: solution-architect
description: Designs and reviews scalable system architecture, module boundaries, service flows, and technical tradeoffs.
tools: Read, Write, Edit, Grep, Glob
---

You are the Solution Architect.
Design for a Dockerized Ubuntu MVP that can migrate to cloud later.
Prefer modular monorepo architecture using Next.js, NestJS, PostgreSQL, pgvector, Redis, BullMQ, and MinIO.
Keep integrations behind connector interfaces.
Keep AI workflows structured, source-cited, auditable, and approval-gated.
Write ADRs for significant decisions.
```

### 19.3 Backend API Agent

Purpose:

- Build NestJS modules.
- Implement API routes.
- Enforce RBAC.
- Implement recommendation and approval APIs.

Prompt:

```markdown
---
name: backend-api
description: Implements NestJS backend modules, APIs, auth guards, services, queues, and tests.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Backend API Engineer.
Follow existing architecture and shared types.
Implement small, testable NestJS modules.
Use DTO validation, service boundaries, Prisma access through package/database, and explicit permission checks.
Never bypass approval workflows for external actions.
Add tests for behavior and edge cases.
```

### 19.4 Frontend UX Agent

Purpose:

- Build dashboard UI.
- Create company/project pages.
- Create approval queue.
- Create transcript upload and diagram screens.

Prompt:

```markdown
---
name: frontend-ux
description: Builds the Next.js dashboard UI, project views, forms, dense work surfaces, and interaction flows.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Frontend UX Engineer.
Build a quiet, dense, work-focused dashboard. Avoid landing-page styling.
Prioritize scanning, comparison, daily workflow, project status, and approval actions.
Use established UI components and accessible interactions.
Verify responsive layout and text fit.
```

### 19.5 Database Agent

Purpose:

- Design Prisma schema.
- Manage migrations.
- Optimize indexes.
- Model company/project/knowledge relationships.

Prompt:

```markdown
---
name: database
description: Designs database schema, Prisma models, migrations, indexes, and data integrity rules.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Database Engineer.
Model company/project hierarchy, integrations, knowledge items, AI runs, recommendations, approvals, diagrams, and compliance profiles.
Use PostgreSQL and pgvector.
Design for auditability, source traceability, and project-level isolation.
Avoid premature complexity, but preserve migration paths.
```

### 19.6 AI/RAG Agent

Purpose:

- Build transcript processing.
- Build project knowledge base.
- Build structured AI output flows.
- Implement citations and source grounding.

Prompt:

```markdown
---
name: ai-rag
description: Implements AI workflows, RAG, transcript analysis, structured outputs, source citation, and prompt/version management.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the AI/RAG Engineer.
All AI outputs must be structured, source-linked where possible, and auditable.
Respect compliance profile settings.
Implement project-scoped retrieval first.
Prefer deterministic schemas over free-form text.
Never make external changes without approval records.
```

### 19.7 Integration Agent

Purpose:

- Build connector interface.
- Implement Jira/Azure DevOps/calendar/email/slack integrations over time.
- Normalize external events.

Prompt:

```markdown
---
name: integration
description: Designs and implements connector interfaces, sync jobs, OAuth handling, normalized events, and external action execution.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Integration Engineer.
Implement connectors through a common interface.
Start read-only unless a feature explicitly requires writes.
All writes must go through approval requests.
Store external IDs and sync runs.
Handle retries, rate limits, and partial failures.
```

### 19.8 Diagram System Agent

Purpose:

- Build diagram JSON schema.
- Build icon registry.
- Build React Flow/SVG renderer.
- Implement export.

Prompt:

```markdown
---
name: diagram-system
description: Builds editable architecture diagram generation, schema, renderer, icon registry, templates, and exports.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Diagram System Engineer.
AI generates structured diagram data; the renderer uses approved icons from an icon registry.
Do not rely on AI-generated flat images for final architecture diagrams.
Support layered architecture diagrams, flow diagrams, sequence/logic diagrams, and export.
Keep diagrams editable and versioned.
```

### 19.9 DevOps Agent

Purpose:

- Build Docker setup.
- Configure Caddy/Nginx.
- Add backup scripts.
- Prepare deployment runbook.

Prompt:

```markdown
---
name: devops
description: Builds Docker Compose deployment, local development scripts, environment management, backup scripts, and Ubuntu runbooks.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the DevOps Engineer.
Target a single Ubuntu server running Docker Compose for MVP.
Use Caddy or Nginx for HTTPS reverse proxy.
Include Postgres, Redis, MinIO, web, api, and worker services.
Document environment variables, backups, restore steps, and operational checks.
Never commit secrets.
```

### 19.10 Security/Compliance QA Agent

Purpose:

- Review auth, RBAC, data handling, audit logs, compliance behavior.
- Identify risks before production.

Prompt:

```markdown
---
name: security-compliance-qa
description: Reviews security, compliance, privacy, RBAC, auditability, external actions, and test coverage.
tools: Read, Grep, Glob, Bash
---

You are the Security and Compliance QA Reviewer.
Prioritize authentication, authorization, token storage, audit logs, data isolation, prompt injection, sensitive data handling, and external action approval.
Report findings with severity, file references, impact, and recommended fix.
Do not modify files unless explicitly asked.
```

## 20. Claude Agent Team Usage

Claude's official docs describe agent teams as experimental and disabled by default. They allow multiple Claude Code instances to work as a team with a lead, teammates, shared task list, and mailbox. The docs recommend 3-5 teammates for most workflows because token cost and coordination overhead grow with team size. See: https://code.claude.com/docs/en/agent-teams

### 20.1 Enable Agent Teams

Project or user settings can include:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "in-process"
}
```

Use `in-process` for simpler terminal usage. Use split panes only if tmux/iTerm setup is stable.

### 20.2 Recommended Team Patterns

Planning team:

```text
Lead: main Claude session
Teammates:
  - product-strategist
  - solution-architect
  - security-compliance-qa
  - database
```

MVP implementation team:

```text
Lead: main Claude session
Teammates:
  - backend-api
  - frontend-ux
  - database
  - ai-rag
```

Diagram feature team:

```text
Lead: main Claude session
Teammates:
  - diagram-system
  - frontend-ux
  - ai-rag
  - security-compliance-qa
```

### 20.3 Example Prompt to Claude

```text
Create an agent team for MVP planning. Use four teammates:
1. product-strategist for requirements and user stories.
2. solution-architect for architecture and module boundaries.
3. database for data model and migrations.
4. security-compliance-qa for privacy, auth, audit, and compliance risks.

Have them work independently, then discuss tradeoffs. Wait for all findings.
Return a consolidated MVP plan with risks, dependencies, and implementation order.
```

### 20.4 Worktree Recommendation

Use Git branches/worktrees for implementation isolation:

```text
feature/auth-company-project
feature/transcript-knowledge-base
feature/today-dashboard
feature/diagram-generator
feature/docker-deployment
```

Do not let multiple agents edit the same branch without coordination.

## 21. Claude MCP Configuration

Claude Code can connect to external tools through MCP. Official Claude Code docs describe MCP as a way to connect Claude Code to tools, databases, APIs, issue trackers, monitoring dashboards, and other external data sources. MCP servers can be local stdio, remote HTTP, SSE, or WebSocket, with HTTP recommended for remote servers where available. See: https://code.claude.com/docs/en/mcp

### 21.1 MCP Scope Strategy

Use scopes carefully:

- User scope: personal tools and credentials across projects.
- Project scope: shared team configuration committed as `.mcp.json`.
- Local scope: private per-project configuration stored outside source control.
- Managed scope: future enterprise controls.

For this project:

- Commit `.mcp.json` only with non-secret configuration and environment-variable placeholders.
- Keep secrets in local environment variables or secure keychain.
- Use read-only credentials for inspection tools.

### 21.2 Recommended MCP Servers for Building the MVP

1. GitHub MCP

Purpose:

- Read issues.
- Review PRs.
- Create issues.
- Manage project backlog.
- Help code review.

2. PostgreSQL MCP

Purpose:

- Inspect schema.
- Query local/dev database.
- Validate migrations.
- Debug data problems.

Use a read-only database user for inspection when possible.

3. Browser/Playwright MCP

Purpose:

- Open local web app.
- Run UI smoke tests.
- Capture screenshots.
- Verify responsive behavior.

4. Atlassian MCP

Purpose:

- Jira/Confluence planning if your backlog or docs live there.
- Pull requirements from Jira.
- Create implementation tasks.

5. Figma MCP

Purpose:

- If a design exists, inspect components/assets.
- Pull design references.

6. Sentry MCP later

Purpose:

- Production error analysis after deployment.

7. Custom Product MCP later

Purpose:

- Expose your own dashboard's project/task/diagram APIs to Claude for controlled automation.

### 21.3 Example `.mcp.json`

This file should live at project root and use environment variables for secrets.

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PAT}"
      }
    },
    "db-readonly": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DATABASE_URL_READONLY}"],
      "env": {}
    },
    "atlassian": {
      "type": "sse",
      "url": "https://mcp.atlassian.com/v1/sse"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

Notes:

- The Atlassian example uses SSE because the documented endpoint currently shows SSE.
- Prefer HTTP over SSE when a server supports both.
- Never hardcode tokens into `.mcp.json`.
- Use `/mcp` inside Claude Code to authenticate remote servers that require OAuth.
- For local stdio servers using `npx`, make sure Node.js is available.

### 21.4 Example Local MCP Commands

```bash
# Add GitHub remote MCP with token header
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"

# Add Postgres read-only database inspector
claude mcp add --transport stdio db-readonly -- \
  npx -y @bytebase/dbhub --dsn "postgresql://readonly:pass@localhost:5432/trishul"

# Add Sentry for future monitoring
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

### 21.5 MCP Safety Rules

- Use least-privilege tokens.
- Prefer read-only database access.
- Use separate dev/staging/prod credentials.
- Review every server before connecting it.
- Be cautious of prompt injection from external content.
- Keep MCP output bounded; large tool output can flood context.
- Do not expose production data to AI until governance is ready.

## 22. Claude Project Configuration

### 22.1 `CLAUDE.md`

The repository should include a `CLAUDE.md` with durable project instructions.

Recommended content:

```markdown
# Claude Project Instructions

This project is the AI Technical Manager Command Center.

## Product Intent

Build a project-centered AI work dashboard for a technical software manager.
The dashboard groups projects under companies/clients, maintains project knowledge bases, analyzes transcripts/messages/tickets/docs, and recommends next actions.

## MVP Infrastructure

Target Docker Compose on Ubuntu, not AWS.
Services: web, api, worker, postgres+pgvector, redis, minio, caddy.

## Tech Stack

Frontend: Next.js, React, TypeScript, Tailwind, shadcn/Radix.
Backend: NestJS, TypeScript, Prisma, PostgreSQL, pgvector, Redis, BullMQ.
Storage: MinIO.
AI: structured agent workflows, project-scoped RAG, human approval.

## Rules

- Keep integrations modular behind connector interfaces.
- Do not bypass approval workflows for external actions.
- Keep compliance profile support in the data model.
- Do not hardcode secrets.
- Use project-scoped knowledge retrieval.
- Prefer structured JSON outputs for AI workflows.
- Add tests for meaningful behavior.
- Keep UI dense, operational, and dashboard-first.

## MVP Priority

1. Company/project model.
2. Transcript upload.
3. Project knowledge base.
4. AI summary/action extraction.
5. Today dashboard.
6. Project dashboard.
7. Diagram generator.
8. Docker deployment.
```

### 22.2 `.claude/settings.json`

Recommended initial project settings:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "MAX_MCP_OUTPUT_TOKENS": "50000"
  },
  "teammateMode": "in-process"
}
```

Only enable experimental agent teams if you want to actively use them. For normal development, subagents are enough.

## 23. MVP Requirements

### 23.1 Functional Requirements

Authentication:

- User can log in.
- User identity is mapped to organization.
- User can view authorized companies/projects.

Company/project:

- User can create a company.
- User can create projects under a company.
- User can set project status.
- User can add stakeholders and team members.
- User can define timeline and milestones.
- User can set compliance profile per project.

Transcript:

- User can upload transcript text/file.
- User can assign transcript to project.
- AI can generate summary.
- AI can extract decisions.
- AI can extract action items.
- AI can suggest tickets/follow-ups.
- User can approve or reject suggestions.

Knowledge base:

- System stores transcript as source item.
- System chunks and embeds content.
- User can search/ask project knowledge base.
- AI responses cite source items where possible.

Dashboard:

- User sees Today view.
- User sees project cards.
- User sees recommendations.
- User sees approval queue.
- User can open project details.

Diagram:

- User can request a diagram from project context.
- AI generates diagram JSON.
- Renderer displays editable diagram.
- User can save diagram.
- User can export diagram as SVG/PNG.

Deployment:

- App runs locally via Docker Compose.
- App can run on Ubuntu server.
- Postgres, Redis, MinIO, web, api, worker, and Caddy are configured.

### 23.2 Non-Functional Requirements

- Type-safe frontend/backend.
- Modular connectors.
- Audit log for AI runs and approvals.
- Project-level data isolation.
- Configurable compliance profile.
- Human approval before external writes.
- Dockerized local and server deployment.
- Backup/restore documented.
- Secrets not committed.
- Basic test coverage.
- Responsive dashboard UI.

### 23.3 Security Requirements

- OAuth/OIDC-ready auth architecture.
- RBAC and project permission checks.
- Secure token storage for future connectors.
- Audit logs for sensitive actions.
- Approval queue for external writes.
- Redaction path for sensitive data.
- Environment-based secrets.
- Read-only MCP/database access for AI build tools.

### 23.4 MVP Acceptance Criteria

The MVP is acceptable when:

- The app runs through Docker Compose.
- User can log in.
- User can create company and project.
- User can upload transcript.
- AI extracts summary, decisions, action items, risks, and follow-ups.
- User can approve/reject AI recommendations.
- Project knowledge base stores sources and supports project-scoped querying.
- Today dashboard shows priorities and pending approvals.
- Project page shows health, timeline, meetings, docs, diagrams, and recommendations.
- User can generate and save an editable diagram from project context.
- Basic audit logs exist for AI runs and approvals.
- Deployment runbook exists for Ubuntu server.

## 24. MVP Phases

### Phase 0: Blueprint and Repository Setup

Deliverables:

- PRD.
- Architecture blueprint.
- Monorepo scaffold.
- Docker Compose skeleton.
- CLAUDE.md.
- Claude subagents.
- MCP config.
- Initial backlog.

### Phase 1: Core App Foundation

Deliverables:

- Next.js app.
- NestJS API.
- PostgreSQL/Prisma.
- Redis/BullMQ.
- MinIO.
- Caddy.
- Auth placeholder/OIDC-ready structure.
- Company/project CRUD.

### Phase 2: Transcript and Knowledge Base

Deliverables:

- Transcript upload.
- Source item storage.
- Chunking.
- Embeddings with pgvector.
- Project-scoped retrieval.
- Meeting summary extraction.
- Decisions/action items extraction.

### Phase 3: Today and Project Dashboards

Deliverables:

- Today dashboard.
- Company overview.
- Project detail page.
- Recommendation list.
- Approval queue.
- Risk/blocker views.

### Phase 4: AI Recommendations and Documents

Deliverables:

- Daily briefing agent.
- Ticket suggestion agent.
- Communication draft agent.
- Scope document generation.
- Approval workflow for generated actions.

### Phase 5: Diagram Generator

Deliverables:

- Diagram schema.
- Icon registry.
- React Flow renderer.
- AI diagram JSON generation.
- Save/version diagrams.
- Export SVG/PNG.

### Phase 6: First External Integrations

Deliverables:

- Jira or Azure DevOps connector.
- Calendar connector.
- Read-only sync.
- Normalized event ingestion.
- Action approval before external writes.

### Phase 7: Communication Connectors

Deliverables:

- Email/Outlook connector.
- Slack connector.
- Teams connector.
- Message recommendation workflow.

### Phase 8: Hardening

Deliverables:

- Security review.
- Compliance policy enforcement.
- Backups.
- Monitoring.
- CI/CD.
- Production deployment checklist.

## 25. Initial Backlog

Epic 1: Project Structure

- Create organization/company/project schema.
- Build company CRUD API.
- Build project CRUD API.
- Build company/project dashboard pages.
- Add compliance profile selection.

Epic 2: Transcript Workflow

- Build upload UI.
- Store transcript file in MinIO.
- Store transcript metadata in Postgres.
- Create background job for analysis.
- Extract summary/decisions/action items.
- Show results in project page.

Epic 3: Knowledge Base

- Create knowledge item/chunk schema.
- Implement chunking.
- Generate embeddings.
- Store vectors in pgvector.
- Implement project-scoped search.
- Build "Ask project" UI.

Epic 4: Recommendations

- Create recommendation schema.
- Create approval request schema.
- Generate recommendations from transcript.
- Build approval queue.
- Track approved/rejected/completed status.

Epic 5: Dashboard

- Build Today page.
- Build project cards.
- Build risk/priority sections.
- Build meeting/follow-up sections.

Epic 6: Diagram System

- Define diagram JSON schema.
- Build icon registry.
- Build React Flow renderer.
- Add AI diagram generator.
- Add export.

Epic 7: Docker Deployment

- Dockerfile for web.
- Dockerfile for API.
- Dockerfile for worker.
- Compose file.
- Caddyfile.
- Backup scripts.
- Ubuntu runbook.

## 26. Risks and Mitigations

Risk: Scope becomes too large.

Mitigation:

- Start with transcript-to-action workflow.
- Keep connectors read-only.
- Build one integration at a time.

Risk: AI output is not trustworthy.

Mitigation:

- Use structured outputs.
- Cite sources.
- Store AI run traces.
- Require approval before external actions.

Risk: Compliance exposure.

Mitigation:

- Avoid real PHI in pilot.
- Add compliance profiles early.
- Add audit logs early.
- Add redaction and classification path.

Risk: Parallel AI agents create messy code.

Mitigation:

- Use a lead Claude session.
- Use branches/worktrees.
- Run parallel agents mostly for research/review.
- Keep implementation tasks scoped.

Risk: Connector complexity delays MVP.

Mitigation:

- Start with manual transcript upload.
- Add Jira/Azure next.
- Add email/Slack/Teams later.

Risk: Diagram feature becomes too complex.

Mitigation:

- Start with schema + React Flow + icon registry.
- Add polished renderer later.

## 27. Recommended First Build Prompt for Claude

Use this when starting implementation:

```text
We are building the AI Technical Manager Command Center.

Use the blueprint in docs/product/blueprint.md as source of truth.
Create a monorepo with:
- apps/web: Next.js + TypeScript + Tailwind
- apps/api: NestJS + TypeScript
- apps/worker: BullMQ workers
- packages/database: Prisma + PostgreSQL + pgvector
- packages/shared: shared types/Zod schemas
- packages/ai: AI workflow schemas and prompt versions
- packages/diagram: diagram schema and icon registry
- infrastructure/compose: Docker Compose and Caddy

Target MVP:
1. company/project model
2. transcript upload
3. knowledge base
4. AI summary/action extraction
5. Today dashboard
6. project dashboard
7. basic diagram generator
8. Docker deployment

Do not build external integrations yet except connector interfaces.
Do not hardcode secrets.
Add CLAUDE.md, .claude/agents, and .mcp.json skeleton.
Create an implementation plan first, then wait for approval before writing code.
```

## 28. Suggested Prompt for Parallel Claude Planning Team

```text
Create an agent team for planning the MVP. Use these teammates:
- product-strategist: validate requirements and MVP scope.
- solution-architect: validate architecture and module boundaries.
- database: validate data model and migration plan.
- security-compliance-qa: review auth, audit, data isolation, compliance risks.

Each teammate should work independently, then share findings.
The lead should synthesize a final implementation plan.
Do not write code yet.
```

## 29. Suggested Prompt for Implementation Sprint 1

```text
Implement Sprint 1 only:
- monorepo scaffold
- Docker Compose for web/api/worker/postgres/redis/minio/caddy
- Prisma schema for organization, user, company, project, compliance_profile
- basic NestJS health endpoint and project/company APIs
- basic Next.js dashboard shell with Today, Companies, Projects navigation

Use small commits or clear change summary.
Add tests where practical.
Do not implement AI yet.
```

## 30. Source Notes

Official sources consulted for Claude/MCP configuration:

- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- Claude Code custom subagents docs: https://code.claude.com/docs/en/sub-agents
- Claude Code agent teams docs: https://code.claude.com/docs/en/agent-teams
- Claude Code settings docs: https://code.claude.com/docs/en/settings
- Claude Code getting started docs: https://docs.anthropic.com/en/docs/claude-code/getting-started

Key source-based points:

- Claude Code can connect to external tools through MCP servers.
- MCP server configuration can be local, project-scoped, user-scoped, or managed.
- Project-scoped MCP config is stored in `.mcp.json`.
- Claude Code supports custom subagents with focused instructions and tool access.
- Subagents run in separate context windows and are useful for preserving main context.
- Agent teams are experimental and disabled by default.
- Agent teams coordinate multiple Claude Code instances through a lead, teammates, task list, and mailbox.
- Agent teams are best for parallel exploration, review, and independent feature work.

## 31. Final Recommendation

Build the MVP in this order:

1. Write the repository blueprint into `docs/product/blueprint.md`.
2. Add `CLAUDE.md`, `.claude/agents/`, and `.mcp.json`.
3. Scaffold the Dockerized monorepo.
4. Build company/project/compliance foundations.
5. Build transcript upload and project knowledge base.
6. Build AI meeting summary and action extraction.
7. Build Today dashboard and project dashboard.
8. Build approval queue.
9. Build basic diagram generator.
10. Add integrations one at a time.

Use Claude as an AI engineering team, but keep human approval at key decision points. The strongest MVP is not a system that does everything automatically. The strongest MVP is a system that becomes your trusted operational truth and then gradually earns permission to automate more work.
