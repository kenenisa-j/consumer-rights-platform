import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class TransferStaffDto {
  @IsNotEmpty({ message: 'New Office ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  newOfficeId!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(64)
  roleInOffice?: string;
}

