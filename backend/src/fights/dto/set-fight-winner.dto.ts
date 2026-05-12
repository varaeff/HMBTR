import { IsNumber } from 'class-validator';

export class SetFightWinnerDto {
  @IsNumber()
  fight_id: number;

  @IsNumber()
  winner_id: number;
}
