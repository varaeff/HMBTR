import { IsNumber } from 'class-validator';

export class CancelWithdrawalDto {
  @IsNumber()
  withdrawal_id: number;
}
