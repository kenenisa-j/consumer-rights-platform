import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddMerchantUserDto {
  @IsNotEmpty({ message: 'User ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  userId!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(['OWNER', 'EMPLOYEE'], { message: 'Role in business must be OWNER or EMPLOYEE.' })
  roleInBusiness?: string;

  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}

