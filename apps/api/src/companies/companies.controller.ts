import {
  Controller, Get, Post, Patch, Delete, Body, Param, Res,
  UseInterceptors, UploadedFile, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

const DEV_ORG_ID = "org_dev";
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll(DEV_ORG_ID);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.companiesService.findOne(id, DEV_ORG_ID);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto, DEV_ORG_ID);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto, DEV_ORG_ID);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.companiesService.remove(id, DEV_ORG_ID);
  }

  // ── Logo ────────────────────────────────────────────────────────────────
  @Post(":id/logo")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ACCEPTED.includes(file.mimetype)) {
      throw new BadRequestException("Logo must be a PNG, JPG, WebP, or SVG image");
    }
    return this.companiesService.setLogo(id, DEV_ORG_ID, file);
  }

  @Delete(":id/logo")
  removeLogo(@Param("id") id: string) {
    return this.companiesService.removeLogo(id, DEV_ORG_ID);
  }

  @Get(":id/logo")
  async getLogo(@Param("id") id: string, @Res() res: Response) {
    const buf = await this.companiesService.getLogo(id, DEV_ORG_ID);
    if (!buf) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(buf);
  }
}
