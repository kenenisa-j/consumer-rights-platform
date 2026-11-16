import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ForwardTipDto {
  @IsOptional()
  @IsString()
  destinationOfficeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  woredaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;
}

