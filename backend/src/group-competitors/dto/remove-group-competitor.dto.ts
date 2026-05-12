import { IsNumber } from 'class-validator';

export class RemoveGroupCompetitorDto {
  @IsNumber()
  id: number;
}
