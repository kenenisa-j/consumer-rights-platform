import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitInvestigationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recommendation?: string;
}

