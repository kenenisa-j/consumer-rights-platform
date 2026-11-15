import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignOfficerDto {
  @IsNotEmpty({ message: 'Target officer ID is required.' })
  @IsString()
  officerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters.' })
  notes?: string;
}

