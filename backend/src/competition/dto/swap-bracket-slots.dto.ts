import { IsNumber } from 'class-validator';

export class SwapBracketSlotsDto {
  @IsNumber()
  block_id: number;

  @IsNumber()
  source_position: number;

  @IsNumber()
  target_position: number;
}
