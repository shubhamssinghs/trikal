import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { LookupsService } from "./lookups.service";

@Controller("lookups")
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get("affiliations") affiliations() { return this.lookups.affiliations(); }
  @Post("affiliations") createAffiliation(@Body() b: { label?: string; color?: string }) { return this.lookups.createAffiliation(b); }
  @Patch("affiliations/:id") updateAffiliation(@Param("id") id: string, @Body() b: { label?: string; color?: string }) { return this.lookups.updateAffiliation(id, b); }
  @Delete("affiliations/:id") deleteAffiliation(@Param("id") id: string) { return this.lookups.deleteAffiliation(id); }

  @Get("roles") roles() { return this.lookups.roles(); }
  @Post("roles") createRole(@Body() b: { label?: string }) { return this.lookups.createRole(b); }
  @Patch("roles/:id") updateRole(@Param("id") id: string, @Body() b: { label?: string }) { return this.lookups.updateRole(id, b); }
  @Delete("roles/:id") deleteRole(@Param("id") id: string) { return this.lookups.deleteRole(id); }

  @Get("organizations") orgs() { return this.lookups.orgs(); }
  @Post("organizations") createOrg(@Body() b: { name?: string }) { return this.lookups.createOrg(b); }
  @Patch("organizations/:id") updateOrg(@Param("id") id: string, @Body() b: { name?: string }) { return this.lookups.updateOrg(id, b); }
  @Delete("organizations/:id") deleteOrg(@Param("id") id: string) { return this.lookups.deleteOrg(id); }
}
