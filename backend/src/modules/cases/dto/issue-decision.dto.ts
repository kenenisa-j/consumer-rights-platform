import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';

export enum DecisionOutcome {
  SUBSTANTIATED = 'SUBSTANTIATED',
  NOT_SUBSTANTIATED = 'NOT_SUBSTANTIATED',
  PARTIALLY_SUBSTANTIATED = 'PARTIALLY_SUBSTANTIATED',
  REFERRAL_REQUIRED = 'REFERRAL_REQUIRED',
  ADDITIONAL_INVESTIGATION_REQUIRED = 'ADDITIONAL_INVESTIGATION_REQUIRED',
}

export enum FinalStatusTarget {
  RESOLVED_ADMINISTRATIVE_ORDER = 'RESOLVED_ADMINISTRATIVE_ORDER',
  RESOLVED_MUTUALLY = 'RESOLVED_MUTUALLY',
  CONCILIATION_SCHEDULED = 'CONCILIATION_SCHEDULED',
  COURT_REFERRAL_ISSUED = 'COURT_REFERRAL_ISSUED',
  INSPECTION_ACTIVE = 'INSPECTION_ACTIVE',
}

export class IssueDecisionDto {
  @IsNotEmpty()
  @IsEnum(DecisionOutcome)
  outcome!: DecisionOutcome;

  @IsNotEmpty()
  @IsEnum(FinalStatusTarget)
  statusTarget!: FinalStatusTarget;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  reasoning!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  correctiveAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remedyInstruction?: string;

  @IsOptional()
  @IsString()
  complianceDeadline?: string;
}

