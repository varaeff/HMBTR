import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateCompetitionBlockDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsOptional()
  @IsBoolean()
  include_third_places?: boolean;
}
