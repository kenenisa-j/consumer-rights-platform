import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartInvestigationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

