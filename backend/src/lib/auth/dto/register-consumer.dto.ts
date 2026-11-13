import { IsNotEmpty, IsString, Matches, Length, MinLength, IsOptional, IsIn } from 'class-validator';

/**
 * Registration payload for citizen consumer accounts.
 */
export class RegisterConsumerDto {
  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be formatted according to E.164 standards (e.g., +251911223344).',
  })
  phoneNumber!: string;

  @IsNotEmpty({ message: 'OTP verification code is required.' })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits.' })
  otp!: string;

  @IsNotEmpty({ message: 'Full name is required.' })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  fullName!: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsOptional()
  @IsString()
  @IsIn(['am', 'en', 'om', 'ti', 'so'], {
    message: 'Preferred language must be one of: am, en, om, ti, so.',
  })
  preferredLanguage?: string;
}
