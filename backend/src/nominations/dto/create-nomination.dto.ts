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

export class CreateNominationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_ru: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en: string;

  @IsBoolean()
  is_male: boolean;

  @IsIn([1, 2, 3])
  rounds: 1 | 2 | 3;

  @IsBoolean()
  round_win: boolean;

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
}
