import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResolutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  correctiveAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remedyInstruction?: string;

  @IsOptional()
  @IsString()
  complianceDeadline?: string;
}

