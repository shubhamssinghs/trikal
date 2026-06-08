import { Controller, Get, Patch, Body } from "@nestjs/common";
import { SettingsService } from "./settings.service";

const DEV_ORG_ID = "org_dev";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getForDashboard(DEV_ORG_ID);
  }

  @Patch()
  update(
    @Body()
    body: {
      llmProvider?: string;
      llmModel?: string;
      anthropicApiKey?: string;
      openaiApiKey?: string;
      voyageApiKey?: string;
    },
  ) {
    return this.settingsService.update(DEV_ORG_ID, body);
  }
}
