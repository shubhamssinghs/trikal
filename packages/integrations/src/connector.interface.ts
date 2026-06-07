export type ConnectorType =
  | "jira"
  | "azure-devops"
  | "slack"
  | "teams"
  | "gmail"
  | "outlook"
  | "google-calendar"
  | "zoom"
  | "google-meet"
  | "google-drive"
  | "sharepoint"
  | "granola";

export interface ConnectorConfig {
  type: ConnectorType;
  integrationId: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface SyncContext {
  integrationId: string;
  projectId?: string;
  companyId?: string;
  since?: Date;
}

export interface SyncResult {
  success: boolean;
  itemsIngested: number;
  errors: string[];
  syncedAt: Date;
}

export interface NormalizedEvent {
  id: string;
  organizationId: string;
  companyId?: string;
  projectId?: string;
  source: ConnectorType;
  sourceType: string;
  externalId: string;
  title: string;
  body?: string;
  author?: { name: string; email?: string };
  occurredAt: Date;
  classification: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalAction {
  type: string;
  integrationId: string;
  approvalRequestId: string;
  payload: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface Connector {
  type: ConnectorType;
  connect(config: ConnectorConfig): Promise<{ success: boolean; error?: string }>;
  sync(context: SyncContext): Promise<SyncResult>;
  normalize(raw: unknown): Promise<NormalizedEvent[]>;
  executeAction(action: ExternalAction): Promise<ActionResult>;
  disconnect(integrationId: string): Promise<void>;
}
