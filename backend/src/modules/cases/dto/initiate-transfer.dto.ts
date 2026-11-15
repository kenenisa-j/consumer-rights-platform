import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TransferDirection } from '@prisma/client';

export class InitiateTransferDto {
  @IsOptional()
  @IsString()
  toOfficeId?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  handoverNote!: string;

  @IsOptional()
  @IsEnum(TransferDirection)
  direction?: TransferDirection;
}

