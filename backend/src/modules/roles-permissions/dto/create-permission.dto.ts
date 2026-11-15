import { IsNotEmpty, IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @IsNotEmpty({ message: 'Permission code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_-]+$/, {
    message: 'Permission code must follow module:action:scope format (e.g. complaints:read:own).',
  })
  code!: string;

  @IsNotEmpty({ message: 'Module is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(64)
  module!: string;

  @IsNotEmpty({ message: 'Action is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(64)
  action!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  scope?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  description?: string;
}

