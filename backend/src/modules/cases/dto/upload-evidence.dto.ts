import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UploadEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  @IsString()
  contentBase64?: string;

  @IsOptional()
  @IsBoolean()
  isOfficerOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

