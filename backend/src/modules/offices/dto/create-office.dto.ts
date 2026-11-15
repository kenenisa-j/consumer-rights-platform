import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { OfficeLevel } from '@prisma/client';

export class CreateOfficeDto {
  @IsNotEmpty({ message: 'Office code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(2, { message: 'Office code must be at least 2 characters.' })
  @MaxLength(64, { message: 'Office code cannot exceed 64 characters.' })
  @Matches(/^[A-Z0-9\-_]+$/, { message: 'Office code may only contain uppercase letters, numbers, hyphens and underscores.' })
  code!: string;

  @IsNotEmpty({ message: 'English office name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'English name must be at least 3 characters.' })
  @MaxLength(255, { message: 'English name cannot exceed 255 characters.' })
  nameEn!: string;

  @IsNotEmpty({ message: 'Amharic office name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Amharic name must be at least 3 characters.' })
  @MaxLength(255, { message: 'Amharic name cannot exceed 255 characters.' })
  nameAm!: string;

  @IsNotEmpty({ message: 'Office level is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn([OfficeLevel.CITY_BUREAU, OfficeLevel.SUBCITY, OfficeLevel.WOREDA], {
    message: 'Level must be CITY_BUREAU, SUBCITY, or WOREDA.',
  })
  level!: OfficeLevel;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  @IsString()
  @MaxLength(64)
  parentOfficeId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  subcityCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  woredaCode?: string;

  @IsNotEmpty({ message: 'Address is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Address must be at least 2 characters.' })
  @MaxLength(255, { message: 'Address cannot exceed 255 characters.' })
  address!: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6, { message: 'Phone number must be at least 6 characters.' })
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters.' })
  phone!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

