import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ComplaintRoute } from '@prisma/client';

/**
 * Validated intake DTO for consumer complaints.
 * Non-whitelisted fields (e.g. status, complainantId, referenceNumber) are rejected.
 */
export class CreateCaseDto {
  @IsNotEmpty({ message: 'Complaint route is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn([ComplaintRoute.DIRECT_GOVERNMENT, ComplaintRoute.REGISTERED_BUSINESS], {
    message: 'Route must be either DIRECT_GOVERNMENT or REGISTERED_BUSINESS.',
  })
  route!: ComplaintRoute;

  @IsNotEmpty({ message: 'Category ID is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Category ID must be a string.' })
  categoryId!: string;

  @IsNotEmpty({ message: 'Incident date is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsDateString({}, { message: 'Incident date must be a valid ISO-8601 date string.' })
  incidentDate!: string;

  @IsNotEmpty({ message: 'Item description is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Item description must be at least 3 characters long.' })
  @MaxLength(2000, { message: 'Item description cannot exceed 2000 characters.' })
  itemDescription!: string;

  @IsNotEmpty({ message: 'Disputed amount is required.' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Disputed amount must be a number with up to 2 decimal places.' },
  )
  @Min(0, { message: 'Disputed amount cannot be negative.' })
  @Max(9999999999.99, {
    message: 'Disputed amount exceeds the maximum allowable value (9,999,999,999.99).',
  })
  disputedAmount!: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === ''
      ? undefined
      : typeof value === 'string'
        ? value.trim().toUpperCase()
        : value,
  )
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a 3-letter currency code (e.g., ETB).' })
  currency?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(50, { message: 'Payment method cannot exceed 50 characters.' })
  paymentMethod?: string;

  @IsOptional()
  @IsBoolean({ message: 'Receipt available must be a boolean.' })
  receiptAvailable?: boolean;

  @IsNotEmpty({ message: 'Desired remedy is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Desired remedy must be at least 2 characters long.' })
  @MaxLength(500, { message: 'Desired remedy cannot exceed 500 characters.' })
  desiredRemedy!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Office ID must be a string.' })
  @MinLength(1, { message: 'Office ID cannot be empty or whitespace-only.' })
  @MaxLength(64, { message: 'Office ID cannot exceed 64 characters.' })
  officeId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Target office ID must be a string.' })
  @MinLength(1, { message: 'Target office ID cannot be empty or whitespace-only.' })
  @MaxLength(64, { message: 'Target office ID cannot exceed 64 characters.' })
  targetOfficeId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim().toLowerCase(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Target level must be a string.' })
  @IsIn(['woreda', 'subcity', 'bureau', 'city_bureau'], {
    message: 'Target level must be one of: woreda, subcity, bureau, city_bureau.',
  })
  targetLevel?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Merchant ID must be a string.' })
  @MinLength(1, { message: 'Merchant ID cannot be empty or whitespace-only.' })
  @MaxLength(64, { message: 'Merchant ID cannot exceed 64 characters.' })
  merchantId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Unregistered merchant name must be a string.' })
  @MinLength(1, { message: 'Unregistered merchant name cannot be empty or whitespace-only.' })
  @MaxLength(200, { message: 'Unregistered merchant name cannot exceed 200 characters.' })
  unregisteredMerchantName?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Unregistered merchant location must be a string.' })
  @MinLength(1, { message: 'Unregistered merchant location cannot be empty or whitespace-only.' })
  @MaxLength(255, { message: 'Unregistered merchant location cannot exceed 255 characters.' })
  unregisteredMerchantLocation?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Unregistered merchant phone must be a string.' })
  @MinLength(1, { message: 'Unregistered merchant phone cannot be empty or whitespace-only.' })
  @MaxLength(32, { message: 'Unregistered merchant phone cannot exceed 32 characters.' })
  unregisteredMerchantPhone?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') { const t = value.trim(); return t === '' ? undefined : t; }
    return value;
  })
  @IsString({ message: 'Market ID must be a string.' })
  @MinLength(1, { message: 'Market ID cannot be empty or whitespace-only.' })
  @MaxLength(64, { message: 'Market ID cannot exceed 64 characters.' })
  marketId?: string;
}
