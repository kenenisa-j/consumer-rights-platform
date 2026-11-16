import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTipDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  category!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  subcity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  woreda?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  marketLocation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetBusinessName?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  marketId?: string;
}

