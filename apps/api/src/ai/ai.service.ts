import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

@Injectable()
export class AiService {
  private readonly client: Anthropic | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (apiKey && apiKey !== "sk-ant-change-me") {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn("ANTHROPIC_API_KEY not configured — AI features will use mock responses");
    }
  }

  get isConfigured() {
    return this.client !== null;
  }

  async complete(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
    if (!this.client) {
      return this.mockResponse(userPrompt);
    }

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = message.content[0];
    return block.type === "text" ? block.text : "";
  }

  private mockResponse(userPrompt: string): string {
    // If the prompt looks like a transcript analysis request, return JSON
    if (userPrompt.includes("Transcript:") && !userPrompt.includes("Question:")) {
      return JSON.stringify({
        summary: `Mock summary — set ANTHROPIC_API_KEY for real AI analysis.`,
        decisions: [{ text: "Mock decision — configure API key for real results", owner: null }],
        actionItems: [
          { text: "Configure ANTHROPIC_API_KEY in .env to enable real AI analysis", owner: "Shubham", dueDate: null },
        ],
        openQuestions: [],
        risks: [{ text: "AI analysis is mocked — configure API key for real results", severity: "medium" }],
        scopeChanges: [],
        suggestedTickets: [
          { title: "Configure Anthropic API key", description: "Set ANTHROPIC_API_KEY in .env", priority: "high" },
        ],
      });
    }

    // For "ask project" and other conversational prompts, return plain text
    const contextSnippet = userPrompt.includes("[Source 1]")
      ? userPrompt.split("[Source 1]")[1]?.substring(0, 300) ?? ""
      : "";

    return contextSnippet
      ? `[Mock AI — set ANTHROPIC_API_KEY for real answers]\n\nBased on the project knowledge base: ${contextSnippet.trim()}...`
      : "[Mock AI — set ANTHROPIC_API_KEY for real answers]\n\nNo relevant context found in the project knowledge base.";
  }
}
