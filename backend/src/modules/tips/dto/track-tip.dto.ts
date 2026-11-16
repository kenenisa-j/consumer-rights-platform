import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TrackTipDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^TIP-\d{4}-\d{5}$/i, {
    message: 'Tip reference must match TIP-YYYY-NNNNN format.',
  })
  reference!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/, {
    message: 'Follow-up code must be an 8-character code, e.g. Q7MD-42KX.',
  })
  code!: string;
}

