import { IsDateString, IsIn, IsInt, IsString, Min } from 'class-validator';

export class CreateDisciplinaryCardDto {
  @IsInt()
  @Min(1)
  fighter_id: number;

  @IsInt()
  @Min(1)
  tournament_id: number;

  @IsInt()
  @Min(1)
  fight_id: number;

  @IsIn(['YELLOW', 'RED'])
  type: 'YELLOW' | 'RED';

  @IsDateString()
  received_at: string;

  @IsString()
  reason: string;
}
