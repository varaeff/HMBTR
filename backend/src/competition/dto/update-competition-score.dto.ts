import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, ValidateNested } from 'class-validator';
import { RoundScoreDto } from './save-competition-results.dto';

export class UpdateCompetitionScoreDto {
  @IsInt()
  fight_id: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoundScoreDto)
  round_scores: RoundScoreDto[];
}
