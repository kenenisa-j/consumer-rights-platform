import {
  IsOptional,
  IsString,
  IsEmail,
  IsIn,
  MinLength,
  MaxLength,
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

export class UpdateStaffDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(['ACTIVE', 'SUSPENDED', 'INACTIVE'])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(GOV_STAFF_ROLES, {
    message: 'Role must be a recognized government staff role.',
  })
  roleCode?: RoleCode;
}

