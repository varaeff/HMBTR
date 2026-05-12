import { IsNumber, IsOptional } from 'class-validator';

export class CreateFightDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsOptional()
  @IsNumber()
  group_id?: number;

  @IsNumber()
  competitor1_id: number;

  @IsNumber()
  competitor2_id: number;

  @IsNumber()
  stage: number;

  @IsNumber()
  fight_number: number;
}
