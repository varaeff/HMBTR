import { IsNumber } from 'class-validator';

export class CreateNoShowWithdrawalDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsNumber()
  competitor_id: number;
}
