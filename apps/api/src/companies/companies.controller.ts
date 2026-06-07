import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

// TODO: replace with real org from JWT once auth middleware is complete
const DEV_ORG_ID = "org_dev";

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
}
