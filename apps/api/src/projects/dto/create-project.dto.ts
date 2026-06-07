import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  programId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetEndDate?: string;

  @IsString()
  @IsOptional()
  complianceProfileId?: string;
}
