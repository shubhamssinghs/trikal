import { Controller, Get, Post, Delete, Body, Param } from "@nestjs/common";
import { LookupsService } from "./lookups.service";

@Controller("lookups")
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get("affiliations") affiliations() { return this.lookups.affiliations(); }
  @Post("affiliations") createAffiliation(@Body() b: { label?: string; color?: string }) { return this.lookups.createAffiliation(b); }
  @Delete("affiliations/:id") deleteAffiliation(@Param("id") id: string) { return this.lookups.deleteAffiliation(id); }

  @Get("roles") roles() { return this.lookups.roles(); }
  @Post("roles") createRole(@Body() b: { label?: string }) { return this.lookups.createRole(b); }
  @Delete("roles/:id") deleteRole(@Param("id") id: string) { return this.lookups.deleteRole(id); }

  @Get("organizations") orgs() { return this.lookups.orgs(); }
  @Post("organizations") createOrg(@Body() b: { name?: string }) { return this.lookups.createOrg(b); }
  @Delete("organizations/:id") deleteOrg(@Param("id") id: string) { return this.lookups.deleteOrg(id); }
}
