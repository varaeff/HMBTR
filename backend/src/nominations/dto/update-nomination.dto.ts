import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateNominationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_ru?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en?: string;

  @IsOptional()
  @IsBoolean()
  is_male?: boolean;

  @IsOptional()
  @IsIn([1, 2, 3])
  rounds?: 1 | 2 | 3;

  @IsOptional()
  @IsBoolean()
  round_win?: boolean;

  @IsOptional()
  @IsBoolean()
  confirm_existing_fights?: boolean;
}
