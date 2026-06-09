import { Module } from "@nestjs/common";
import { ProactiveService } from "./proactive.service";
import { ProactiveController } from "./proactive.controller";

@Module({
  controllers: [ProactiveController],
  providers: [ProactiveService],
  exports: [ProactiveService],
})
export class ProactiveModule {}
