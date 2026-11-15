import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BusinessInvestigationResponseDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  statement!: string;
}

