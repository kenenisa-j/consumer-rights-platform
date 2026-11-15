import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OfficeLevel } from '@prisma/client';

export class QueryCategoryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(OfficeLevel)
  @IsOptional()
  remitLevel?: OfficeLevel;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;
}

