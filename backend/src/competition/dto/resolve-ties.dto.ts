import { IsArray, IsNumber } from 'class-validator';

export class ResolveTiesDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsNumber()
  group_id: number;

  @IsArray()
  ordered_competitor_ids: number[];
}
