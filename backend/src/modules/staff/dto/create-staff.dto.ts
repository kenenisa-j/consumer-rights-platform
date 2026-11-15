import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RoleCode } from '@prisma/client';

const GOV_STAFF_ROLES = [
  RoleCode.WOREDA_OFFICER,
  RoleCode.WOREDA_ADMIN,
  RoleCode.SUBCITY_COORDINATOR,
  RoleCode.BUREAU_OFFICER,
  RoleCode.BUREAU_ADMIN,
  RoleCode.CONTENT_ADMIN,
  RoleCode.SYSTEM_SUPERADMIN,
];

export class CreateStaffDto {
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^(\+251|0)?[79]\d{8}$/, {
    message: 'Phone number must be a valid Ethiopian phone number (e.g. +251911223344 or 0911223344).',
  })
  phoneNumber!: string;

  @IsNotEmpty({ message: 'Full name is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Full name must be at least 3 characters.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName!: string;

  @IsNotEmpty({ message: 'Email address is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @MaxLength(120, { message: 'Email cannot exceed 120 characters.' })
  email!: string;

  @IsNotEmpty({ message: 'Initial password is required.' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsNotEmpty({ message: 'Government staff role code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(GOV_STAFF_ROLES, {
    message: 'Role must be a recognized government staff role.',
  })
  roleCode!: RoleCode;

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
  officeId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  roleInOffice?: string;
}

