import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters.' })
  notes?: string;
}

