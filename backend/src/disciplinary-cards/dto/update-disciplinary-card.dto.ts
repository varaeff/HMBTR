import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDisciplinaryCardDto {
  @IsOptional()
  @IsIn(['YELLOW', 'RED'])
  type?: 'YELLOW' | 'RED';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
