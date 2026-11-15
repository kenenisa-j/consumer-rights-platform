import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters.' })
  reason?: string;
}

