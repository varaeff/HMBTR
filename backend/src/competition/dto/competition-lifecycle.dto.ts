import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { SaveCompetitionResultFightDto } from './save-competition-results.dto';

export class CompetitionLifecycleDto {
  @IsNumber()
  block_id: number;

  @IsOptional()
  @IsNumber()
  round?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveCompetitionResultFightDto)
  fights?: SaveCompetitionResultFightDto[];

  @IsOptional()
  @IsBoolean()
  remove_active_red_competitors?: boolean;
}
