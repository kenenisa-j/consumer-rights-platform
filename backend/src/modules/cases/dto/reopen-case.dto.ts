import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReopenCaseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reopenReason!: string;
}

