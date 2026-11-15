import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class ScheduleInspectionDto {
  @IsOptional()
  @IsString()
  leadInspectorId?: string;

  @IsNotEmpty()
  @IsDateString()
  inspectionDate!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  locationName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  inspectionType!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionTaken?: string;
}

