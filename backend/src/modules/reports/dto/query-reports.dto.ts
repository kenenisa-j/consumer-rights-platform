import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryReportsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

