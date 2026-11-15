import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMerchantDto {
  @IsNotEmpty({ message: 'Registration number is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3, { message: 'Registration number must be at least 3 characters.' })
  @MaxLength(64, { message: 'Registration number cannot exceed 64 characters.' })
  registrationNumber!: string;

  @IsNotEmpty({ message: 'Trade name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Trade name must be at least 2 characters.' })
  @MaxLength(255)
  tradeName!: string;

  @IsNotEmpty({ message: 'Legal business name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Legal name must be at least 2 characters.' })
  @MaxLength(255)
  legalName!: string;

  @IsNotEmpty({ message: 'Business type is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  businessType!: string;

  @IsNotEmpty({ message: 'Business category is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  businessCategory!: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^(\+251|0)?[79]\d{8}$/, {
    message: 'Must be a valid Ethiopian phone number.',
  })
  phoneNumber!: string;

  @IsNotEmpty({ message: 'Woreda office ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  woredaOfficeId!: string;

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
  marketId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  stallNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

