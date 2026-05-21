import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateDisciplinaryCardDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
