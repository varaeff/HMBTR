import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

export class SaveCompetitionResultFightDto {
  @IsNumber()
  fight_id: number;

  @IsNumber()
  competitor1_score: number;

  @IsNumber()
  competitor2_score: number;
}

export class SaveCompetitionResultsDto {
  @IsNumber()
  block_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveCompetitionResultFightDto)
  fights: SaveCompetitionResultFightDto[];
}
