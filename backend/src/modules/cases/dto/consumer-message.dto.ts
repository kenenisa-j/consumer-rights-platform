import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConsumerMessageDto {
  @IsNotEmpty({ message: 'Message content is required.' })
  @IsString()
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters.' })
  message!: string;
}

