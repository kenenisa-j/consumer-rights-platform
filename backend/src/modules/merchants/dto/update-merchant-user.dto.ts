import { IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMerchantUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(['OWNER', 'EMPLOYEE'], { message: 'Role in business must be OWNER or EMPLOYEE.' })
  roleInBusiness?: string;

  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}

