import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  Matches,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTipDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcity?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : typeof value === 'number' ? String(value) : value))
  @Matches(/^\d{1,2}$/, { message: 'Woreda must be a 1 or 2 digit number.' })
  woreda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  marketLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  place?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetBusinessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  business?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  product?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString({}, { message: 'Date must be a valid ISO date string.' })
  when?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString({}, { message: 'Date must be a valid ISO date string.' })
  seenOn?: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  marketId?: string;
}
