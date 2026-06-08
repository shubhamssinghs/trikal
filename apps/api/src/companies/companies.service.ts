import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { StorageService } from "../storage/storage.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

const LOGO_SIZE = 256; // fixed square

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.company.findMany({
      where: { organizationId },
      include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId },
      include: {
        projects: { orderBy: { createdAt: "desc" } },
        stakeholders: true,
        complianceProfile: true,
      },
    });
    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  create(dto: CreateCompanyDto, organizationId: string) {
    return this.prisma.company.create({
      data: { ...dto, organizationId },
    });
  }

  async update(id: string, dto: UpdateCompanyDto, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.company.delete({ where: { id } });
  }

  /** Optimize an uploaded image to a fixed-size WebP and store it. */
  async setLogo(id: string, organizationId: string, file: Express.Multer.File) {
    await this.findOne(id, organizationId);

    const optimized = await sharp(file.buffer)
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();

    const key = `company-logos/${id}.webp`;
    await this.storage.uploadFile(key, optimized, "image/webp");
    await this.prisma.company.update({ where: { id }, data: { logoKey: key } });
    return { ok: true, logoKey: key };
  }

  async removeLogo(id: string, organizationId: string) {
    const company = await this.findOne(id, organizationId);
    if (company.logoKey) await this.storage.deleteFile(company.logoKey);
    await this.prisma.company.update({ where: { id }, data: { logoKey: null } });
    return { ok: true };
  }

  async getLogo(id: string, organizationId: string): Promise<Buffer | null> {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId },
      select: { logoKey: true },
    });
    if (!company?.logoKey) return null;
    return this.storage.getObject(company.logoKey);
  }
}
