import { IsNumber } from 'class-validator';

export class GenerateOlympicFightsDto {
  @IsNumber()
  block_id: number;
}
