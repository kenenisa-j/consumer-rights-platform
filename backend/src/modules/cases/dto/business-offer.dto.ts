import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SettlementType } from '@prisma/client';

export class BusinessOfferDto {
  @IsNotEmpty()
  @IsEnum(SettlementType)
  offerType!: SettlementType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  refundAmount?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  termsDescription!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

