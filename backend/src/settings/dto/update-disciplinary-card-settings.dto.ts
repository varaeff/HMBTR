import { IsIn, IsInt, Max, Min } from 'class-validator';

export class UpdateDisciplinaryCardSettingsDto {
  @IsIn(['END_OF_YEAR_MONTH', 'DAYS'])
  yellow_expiration_mode: 'END_OF_YEAR_MONTH' | 'DAYS';

  @IsInt()
  @Min(1)
  @Max(12)
  yellow_expiration_month: number;

  @IsInt()
  @Min(1)
  yellow_expiration_days: number;

  @IsInt()
  @Min(1)
  red_auto_yellow_days: number;

  @IsInt()
  @Min(1)
  red_manual_days: number;

  @IsInt()
  @Min(1)
  red_manual_with_one_yellow_days: number;

  @IsInt()
  @Min(1)
  red_manual_with_two_or_more_yellows_days: number;
}
