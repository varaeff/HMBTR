import { IsNumber } from 'class-validator';

export class FinishCompetitionDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;
}
