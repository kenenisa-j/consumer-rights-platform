import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryPermissionDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  module?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  scope?: string;
}

