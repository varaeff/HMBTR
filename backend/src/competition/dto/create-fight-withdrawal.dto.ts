import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class CreateFightWithdrawalDto {
  @IsNumber()
  fight_id: number;

  @IsNumber()
  competitor_id: number;

  @IsString()
  reason: string;

  @IsBoolean()
  is_excused: boolean;
}
