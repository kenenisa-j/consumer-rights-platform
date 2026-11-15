import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RejectTransferDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}

