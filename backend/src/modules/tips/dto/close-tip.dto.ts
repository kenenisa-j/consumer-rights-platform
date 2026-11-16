import {
  IsNotEmpty,
  IsString,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CloseTipDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['closed_action_taken', 'closed_no_action'], {
    message: 'Result must be closed_action_taken or closed_no_action.',
  })
  result!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;
}

