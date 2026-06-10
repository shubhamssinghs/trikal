import { Module } from "@nestjs/common";
import { ChartsService } from "./charts.service";
import { ChartsController } from "./charts.controller";

@Module({
  controllers: [ChartsController],
  providers: [ChartsService],
  exports: [ChartsService],
})
export class ChartsModule {}
