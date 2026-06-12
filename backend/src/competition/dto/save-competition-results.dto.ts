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

const MAX_SCORE = 2_147_483_647;

export class RoundScoreDto {
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor1_score: number;

  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor2_score: number;
}

export class SaveCompetitionResultFightDto {
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

export class SaveCompetitionResultsDto {
  @IsInt()
  block_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveCompetitionResultFightDto)
  fights: SaveCompetitionResultFightDto[];
}
