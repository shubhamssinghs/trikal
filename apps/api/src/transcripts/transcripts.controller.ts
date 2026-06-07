import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { TranscriptsService } from "./transcripts.service";
import { CreateTranscriptDto } from "./dto/create-transcript.dto";

const DEV_ORG_ID = "org_dev";

@Controller("transcripts")
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Post()
  create(@Body() dto: CreateTranscriptDto) {
    return this.transcriptsService.create(dto, DEV_ORG_ID);
  }

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.transcriptsService.findByProject(projectId, DEV_ORG_ID);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.transcriptsService.findOne(id, DEV_ORG_ID);
  }
}
