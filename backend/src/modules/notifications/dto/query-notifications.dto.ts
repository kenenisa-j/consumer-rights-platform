import { IsOptional, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NotificationType } from '../notifications.types';

export class QueryNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

