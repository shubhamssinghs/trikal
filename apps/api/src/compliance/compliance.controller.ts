import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { ComplianceService } from "./compliance.service";

@Controller("compliance-profiles")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get()
  findAll() {
    return this.complianceService.findAll();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.complianceService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.complianceService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.complianceService.remove(id);
  }
}
