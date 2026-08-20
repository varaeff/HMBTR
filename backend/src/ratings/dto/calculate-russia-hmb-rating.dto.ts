import { IsIn, IsNumber } from 'class-validator';

export class CalculateRussiaHmbRatingDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsIn([1, 2, 4])
  coefficient: 1 | 2 | 4;
}
