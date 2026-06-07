import { IsString, IsOptional, IsDateString, IsEnum } from "class-validator";
import { ProjectStatus } from "@prisma/client";

export class UpdateProjectDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(ProjectStatus) @IsOptional() status?: ProjectStatus;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() targetEndDate?: string;
  @IsString() @IsOptional() complianceProfileId?: string;
}
