import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";

export class CreateTranscriptDto {
  @IsString() @IsNotEmpty() projectId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() rawContent!: string;
  @IsDateString() @IsOptional() occurredAt?: string;
  @IsString() @IsOptional() classification?: string;
}
