import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignStaffDto {
  @IsNotEmpty({ message: 'User ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  userId!: string;

  @IsNotEmpty({ message: 'Office ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  officeId!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  roleInOffice?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

