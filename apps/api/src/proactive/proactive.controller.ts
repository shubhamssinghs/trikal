import { Controller, Get, Post, Param } from "@nestjs/common";
import { ProactiveService } from "./proactive.service";

const DEV_ORG_ID = "org_dev";

@Controller("proactive")
export class ProactiveController {
  constructor(private readonly proactive: ProactiveService) {}

  /** Open insights for the dashboard "Needs your attention" panel. */
  @Get()
  list() {
    return this.proactive.list(DEV_ORG_ID);
  }

  /** Force a fresh scan (also runs on a schedule). */
  @Post("scan")
  scan() {
    return this.proactive.scan(DEV_ORG_ID);
  }

  @Post(":id/dismiss")
  dismiss(@Param("id") id: string) {
    return this.proactive.dismiss(id, DEV_ORG_ID);
  }
}
