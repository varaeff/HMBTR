import { IsArray, IsIn, IsNumber, IsOptional } from 'class-validator';

export class ResolveTiesDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsOptional()
  @IsNumber()
  group_id?: number;

  @IsOptional()
  @IsNumber()
  block_id?: number;

  @IsOptional()
  @IsNumber()
  fight_id?: number;

  @IsOptional()
  @IsIn(['GROUP', 'OLYMPIC_THIRD', 'OLYMPIC_DOUBLE_RED'])
  tie_scope?: 'GROUP' | 'OLYMPIC_THIRD' | 'OLYMPIC_DOUBLE_RED';

  @IsArray()
  ordered_competitor_ids: number[];
}
