import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateCompetitorDto {
  @IsNumber()
  @IsNotEmpty()
  fighter_id: number;

  @IsNumber()
  @IsNotEmpty()
  tournament_id: number;

  @IsNumber()
  @IsNotEmpty()
  nomination_id: number;
}
