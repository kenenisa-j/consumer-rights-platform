import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateMarketDto {
  @IsNotEmpty({ message: 'Market code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(2, { message: 'Market code must be at least 2 characters.' })
  @MaxLength(64, { message: 'Market code cannot exceed 64 characters.' })
  @Matches(/^[A-Z0-9\-_]+$/, {
    message: 'Market code may only contain uppercase letters, numbers, hyphens and underscores.',
  })
  code!: string;

  @IsNotEmpty({ message: 'English market name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'English name must be at least 3 characters.' })
  @MaxLength(255)
  nameEn!: string;

  @IsNotEmpty({ message: 'Amharic market name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Amharic name must be at least 3 characters.' })
  @MaxLength(255)
  nameAm!: string;

  @IsNotEmpty({ message: 'Sub-City code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  subcityCode!: string;

  @IsNotEmpty({ message: 'Woreda office ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  woredaOfficeId!: string;

  @IsNotEmpty({ message: 'Location description is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: 'Location description must be at least 5 characters.' })
  @MaxLength(500)
  locationDescription!: string;

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
  @MaxLength(100)
  gpsCoordinates?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Total stalls must be an integer.' })
  @Min(0)
  @Max(100000)
  totalStalls?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

