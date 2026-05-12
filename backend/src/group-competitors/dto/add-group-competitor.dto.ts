import { IsNumber } from 'class-validator';

export class AddGroupCompetitorDto {
  @IsNumber()
  group_id: number;

  @IsNumber()
  competitor_id: number;
}
