import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { SettingsService } from "../settings/settings.service";

const DEV_ORG_ID = "org_dev";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly settings: SettingsService) {}

  /** Whether the currently-selected provider has a usable key. */
  async isConfigured(organizationId = DEV_ORG_ID): Promise<boolean> {
    const s = await this.settings.resolve(organizationId);
    return s.llmProvider === "openai"
      ? Boolean(s.openaiApiKey)
      : Boolean(s.anthropicApiKey);
  }

  async currentModel(organizationId = DEV_ORG_ID): Promise<string> {
    const s = await this.settings.resolve(organizationId);
    return `${s.llmProvider}:${s.llmModel}`;
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
    organizationId = DEV_ORG_ID,
  ): Promise<string> {
    const s = await this.settings.resolve(organizationId);

    try {
      if (s.llmProvider === "openai") {
        if (!s.openaiApiKey) return this.mockResponse(userPrompt);
        return await this.completeOpenAI(s.openaiApiKey, s.llmModel, systemPrompt, userPrompt, maxTokens);
      }
      // default: anthropic
      if (!s.anthropicApiKey) return this.mockResponse(userPrompt);
      return await this.completeAnthropic(s.anthropicApiKey, s.llmModel, systemPrompt, userPrompt, maxTokens);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("credit balance") || msg.includes("insufficient") || msg.includes("quota")) {
        this.logger.error(`${s.llmProvider}: insufficient credits/quota`);
        return `[${s.llmProvider} API: insufficient credits or quota. Check your billing, or switch provider in Settings.]`;
      }
      if (msg.includes("401") || msg.includes("authentication") || msg.includes("Incorrect API key")) {
        this.logger.error(`${s.llmProvider}: invalid API key`);
        return `[${s.llmProvider} API: invalid API key. Update it in Settings.]`;
      }
      if (msg.includes("429") || msg.includes("rate")) {
        this.logger.warn(`${s.llmProvider} rate limited, using mock response`);
        return this.mockResponse(userPrompt);
      }
      throw err;
    }
  }

  private async completeAnthropic(apiKey: string, model: string, system: string, user: string, maxTokens: number) {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: model || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = message.content[0];
    return block.type === "text" ? block.text : "";
  }

  private async completeOpenAI(apiKey: string, model: string, system: string, user: string, maxTokens: number) {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: model || "gpt-4o",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  private mockResponse(userPrompt: string): string {
    if (userPrompt.includes("Transcript:") && !userPrompt.includes("Question:")) {
      return JSON.stringify({
        summary: "Mock summary — configure an LLM provider key in Settings for real analysis.",
        decisions: [{ text: "Mock decision — configure API key for real results", owner: null }],
        actionItems: [{ text: "Add an Anthropic or OpenAI key in Settings", owner: null, dueDate: null }],
        openQuestions: [],
        risks: [{ text: "AI analysis is mocked — no provider key configured", severity: "medium" }],
        scopeChanges: [],
        suggestedTickets: [{ title: "Configure LLM provider", description: "Set a key in Settings", priority: "high" }],
      });
    }
    const contextSnippet = userPrompt.includes("[Source 1]")
      ? userPrompt.split("[Source 1]")[1]?.substring(0, 300) ?? ""
      : "";
    return contextSnippet
      ? `[Mock AI — configure a provider key in Settings]\n\nBased on the project knowledge base: ${contextSnippet.trim()}...`
      : "[Mock AI — configure a provider key in Settings]\n\nNo relevant context found in the project knowledge base.";
  }
}
