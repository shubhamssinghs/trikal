import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaClient) {}

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
}
