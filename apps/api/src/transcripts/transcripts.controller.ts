import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseInterceptors, UploadedFile, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TranscriptsService } from "./transcripts.service";
import { CreateTranscriptDto } from "./dto/create-transcript.dto";

const DEV_ORG_ID = "org_dev";

const ACCEPTED_TYPES = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

@Controller("transcripts")
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  /** Text-based upload (JSON body) */
  @Post()
  create(@Body() dto: CreateTranscriptDto) {
    return this.transcriptsService.create(dto, DEV_ORG_ID);
  }

  /** File upload (multipart/form-data) */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("projectId") projectId: string,
    @Body("title") title: string,
  ) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ACCEPTED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Only TXT, PDF, and DOCX files are accepted");
    }
    return this.transcriptsService.createFromFile(
      { projectId, title: title || file.originalname, file },
      DEV_ORG_ID,
    );
  }

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.transcriptsService.findByProject(projectId, DEV_ORG_ID);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.transcriptsService.findOne(id, DEV_ORG_ID);
  }

  @Get(":id/download-url")
  getDownloadUrl(@Param("id") id: string) {
    return this.transcriptsService.getDownloadUrl(id, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.transcriptsService.remove(id, DEV_ORG_ID);
  }
}
