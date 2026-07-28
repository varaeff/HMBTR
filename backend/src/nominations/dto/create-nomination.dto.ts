import {
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
