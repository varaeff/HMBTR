import { IsNumber } from 'class-validator';

export class CreateCompetitionBlockDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;
}
