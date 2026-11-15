import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EscalateCaseDto {
  @IsOptional()
  @IsString()
  targetOfficeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Escalation reason cannot exceed 1000 characters.' })
  reason?: string;
}

