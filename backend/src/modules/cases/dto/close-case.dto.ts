import { IsNotEmpty, IsString, IsEnum, MaxLength } from 'class-validator';

export enum CaseClosureReason {
  RESOLVED_COMPLIANCE_CONFIRMED = 'RESOLVED_COMPLIANCE_CONFIRMED',
  RESOLVED_MUTUAL_AGREEMENT = 'RESOLVED_MUTUAL_AGREEMENT',
  REFERRED_TO_COURT = 'REFERRED_TO_COURT',
  OUTSIDE_JURISDICTION = 'OUTSIDE_JURISDICTION',
  WITHDRAWN_BY_CONSUMER = 'WITHDRAWN_BY_CONSUMER',
}

export class CloseCaseDto {
  @IsNotEmpty()
  @IsEnum(CaseClosureReason)
  closureReason!: CaseClosureReason;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  closureNotes!: string;
}

