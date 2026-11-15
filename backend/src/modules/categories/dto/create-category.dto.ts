import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { OfficeLevel } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @IsString()
  @IsNotEmpty()
  nameAm!: string;

  @IsString()
  @IsOptional()
  nameOm?: string;

  @IsString()
  @IsOptional()
  nameTi?: string;

  @IsString()
  @IsOptional()
  nameSo?: string;

  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  defaultSlaDays?: number;

  @IsEnum(OfficeLevel)
  @IsOptional()
  defaultRemitLevel?: OfficeLevel;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

