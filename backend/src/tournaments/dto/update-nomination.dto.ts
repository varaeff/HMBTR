import { IsNumber, IsBoolean } from 'class-validator';

export class UpdateNominationDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsBoolean()
  is_open: boolean;
}
