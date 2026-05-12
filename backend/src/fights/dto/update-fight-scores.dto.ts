import { IsNumber, IsOptional } from 'class-validator';

export class UpdateFightScoresDto {
  @IsNumber()
  fight_id: number;

  @IsOptional()
  @IsNumber()
  competitor1_score?: number;

  @IsOptional()
  @IsNumber()
  competitor2_score?: number;
}
