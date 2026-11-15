import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BusinessResponseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message!: string;
}

