import { Injectable, Logger } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";

/** A tool exposed by an MCP server, in the shape the agent runtime needs. */
export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// The MCP SDK is ESM-only; our API compiles to CommonJS. A normal import/require
// can't load it, and TS would downlevel a dynamic import() to require(). This
// Function wrapper preserves a real runtime import() so Node loads the ESM build.
const importEsm = new Function("s", "return import(s)") as (s: string) => Promise<any>;

const TAVILY_MCP_URL = "https://mcp.tavily.com/mcp/";
const TOOLS_CACHE_MS = 10 * 60 * 1000; // tool schemas are static; refresh occasionally
const MAX_RESULT_CHARS = 8000;

/**
 * Generic MCP client layer. The agent can call tools from any configured MCP
 * server; today the only server is Tavily (web search), gated by the org's
 * webSearchEnabled toggle + Tavily key. Built to generalize: add a server here
 * and its tools automatically flow into the agent's tool list.
 *
 * Connections are opened per operation (list/call) and closed in finally —
 * web search is occasional, so a short-lived connection is simpler and robust.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private toolCache = new Map<string, { tools: McpToolDef[]; exp: number }>();

  constructor(private readonly settings: SettingsService) {}

  /** Resolve which MCP servers are enabled for this org (just Tavily for now). */
  private async tavilyKey(organizationId: string): Promise<string | null> {
    const s = await this.settings.resolve(organizationId);
    return s.webSearchEnabled && s.tavilyApiKey ? s.tavilyApiKey : null;
  }

  private tavilyUrl(key: string): URL {
    const u = new URL(TAVILY_MCP_URL);
    u.searchParams.set("tavilyApiKey", key);
    return u;
  }

  /** Connect to an MCP server, run fn with the client, always close. */
  private async withClient<T>(url: URL, fn: (client: any) => Promise<T>): Promise<T> {
    const { Client } = await importEsm("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await importEsm("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const client = new Client({ name: "trikal-agent", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(url);
    try {
      await client.connect(transport);
      return await fn(client);
    } finally {
      await client.close().catch(() => {});
    }
  }

  /** Tool definitions to expose to the agent for this org (empty if disabled). */
  async toolsFor(organizationId: string): Promise<McpToolDef[]> {
    const key = await this.tavilyKey(organizationId);
    if (!key) return [];

    const cached = this.toolCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.tools;

    try {
      const tools = await this.withClient(this.tavilyUrl(key), async (c) => {
        const res = await c.listTools();
        return (res.tools ?? []).map((t: any): McpToolDef => ({
          name: t.name,
          description: t.description ?? "",
          inputSchema: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
        }));
      });
      this.toolCache.set(key, { tools, exp: Date.now() + TOOLS_CACHE_MS });
      return tools;
    } catch (e) {
      this.logger.error(`Tavily MCP listTools failed: ${e instanceof Error ? e.message : e}`);
      return [];
    }
  }

  /** Call an MCP tool by name and return its text result for the model. */
  async callTool(organizationId: string, name: string, args: Record<string, unknown>): Promise<string> {
    const key = await this.tavilyKey(organizationId);
    if (!key) return "Web search is not enabled. Turn it on and add a Tavily API key in Settings → AI & Models.";
    try {
      return await this.withClient(this.tavilyUrl(key), async (c) => {
        const res = await c.callTool({ name, arguments: args });
        const text = (res.content ?? [])
          .map((b: any) => (b?.type === "text" ? b.text : JSON.stringify(b)))
          .join("\n")
          .slice(0, MAX_RESULT_CHARS);
        return text || "(web search returned no results)";
      });
    } catch (e) {
      this.logger.error(`Tavily MCP callTool ${name} failed: ${e instanceof Error ? e.message : e}`);
      return `Web search failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
}
