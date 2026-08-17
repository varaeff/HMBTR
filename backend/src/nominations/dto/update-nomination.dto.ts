import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const MAX_ROUND_TIME_SECONDS = 3_599;

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
  @IsInt()
  @Min(0)
  @Max(MAX_ROUND_TIME_SECONDS)
  main_round_time?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ROUND_TIME_SECONDS)
  additional_round_time?: number;

  @IsOptional()
  @IsBoolean()
  confirm_existing_fights?: boolean;
}
