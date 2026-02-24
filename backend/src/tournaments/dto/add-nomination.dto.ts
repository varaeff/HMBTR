import { IsNumber } from 'class-validator';

export class AddNominationDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;
}
