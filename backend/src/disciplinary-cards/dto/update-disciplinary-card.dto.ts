import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateDisciplinaryCardDto {
  @IsOptional()
  @IsIn(['YELLOW', 'RED'])
  type?: 'YELLOW' | 'RED';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  marshal_id?: number;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
