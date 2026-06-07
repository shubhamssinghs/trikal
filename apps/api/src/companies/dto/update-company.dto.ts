import { IsString, IsOptional } from "class-validator";

export class UpdateCompanyDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() complianceProfileId?: string;
}
