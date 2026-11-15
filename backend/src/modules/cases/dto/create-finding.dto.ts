import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateFindingDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  metricName!: string;

  @IsOptional()
  @IsNumber()
  nominalValue?: number;

  @IsNotEmpty()
  @IsNumber()
  measuredValue!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit!: string;

  @IsNotEmpty()
  @IsBoolean()
  isViolation!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

