import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConvertTipDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  @IsOptional()
  @IsString()
  assignedOfficerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

