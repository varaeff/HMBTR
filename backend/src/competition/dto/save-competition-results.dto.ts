import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_SCORE = 2_147_483_647;
const MAX_ROUND_DURATION_SECONDS = 3_599;

export class RoundScoreDto {
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor1_score: number;

  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  competitor2_score: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ROUND_DURATION_SECONDS)
  duration_seconds?: number;
}

export class FightWarningDto {
  @IsInt()
  competitor_id: number;

  @IsInt()
  @Min(1)
  round: number;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  reason: string;
}

export class SaveCompetitionResultFightDto {
  @IsInt()
  fight_id: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoundScoreDto)
  round_scores?: RoundScoreDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => FightWarningDto)
  warnings?: FightWarningDto[];
}

export class SaveCompetitionResultsDto {
  @IsInt()
  block_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveCompetitionResultFightDto)
  fights: SaveCompetitionResultFightDto[];
}
