import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class QueryBusinessCasesDto {
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

