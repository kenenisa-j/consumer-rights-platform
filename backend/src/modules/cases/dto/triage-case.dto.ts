import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TriageCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters.' })
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Priority label cannot exceed 50 characters.' })
  priority?: string;
}

