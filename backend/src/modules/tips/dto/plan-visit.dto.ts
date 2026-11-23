import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PlanVisitDto {
  @IsNotEmpty()
  @IsString()
  scheduledDate!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  assignedOfficer!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(400)
  notes!: string;
}

