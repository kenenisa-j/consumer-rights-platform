import { IsNotEmpty, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { RoleCode } from '@prisma/client';

export class AssignRoleDto {
  @IsNotEmpty({ message: 'Role code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(Object.values(RoleCode), { message: 'Invalid role code.' })
  roleCode!: RoleCode;
}

