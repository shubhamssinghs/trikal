import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TranscriptsController } from "./transcripts.controller";
import { TranscriptsService } from "./transcripts.service";

@Module({
  imports: [MulterModule.register({ storage: undefined })], // memory storage
  controllers: [TranscriptsController],
  providers: [TranscriptsService],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
