import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignPermissionDto {
  @IsNotEmpty({ message: 'Permission code is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  permissionCode!: string;
}

