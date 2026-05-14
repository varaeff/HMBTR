import { IsNumber } from 'class-validator';

export class UpdateCompetitionScoreDto {
  @IsNumber()
  fight_id: number;

  @IsNumber()
  competitor1_score: number;

  @IsNumber()
  competitor2_score: number;
}
