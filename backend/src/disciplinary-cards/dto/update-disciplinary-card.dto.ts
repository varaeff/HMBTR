import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDisciplinaryCardDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  fighter_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tournament_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  fight_id?: number;

  @IsOptional()
  @IsIn(['YELLOW', 'RED'])
  type?: 'YELLOW' | 'RED';

  @IsOptional()
  @IsDateString()
  received_at?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
