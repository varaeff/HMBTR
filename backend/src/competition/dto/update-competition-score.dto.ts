import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RoundScoreDto } from './save-competition-results.dto';

const MAX_SCORE = 2_147_483_647;

export class UpdateCompetitionScoreDto {
  @IsInt()
  fight_id: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor1_score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor2_score?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => RoundScoreDto)
  round_scores?: RoundScoreDto[];
}
