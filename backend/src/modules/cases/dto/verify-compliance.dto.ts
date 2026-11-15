import {
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class VerifyComplianceDto {
  @IsNotEmpty()
  @IsBoolean()
  isComplied!: boolean;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  verificationNotes!: string;

  @IsOptional()
  @IsString()
  penaltyNotice?: string;
}

