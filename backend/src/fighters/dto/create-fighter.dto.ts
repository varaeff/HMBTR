import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateFighterDto {
  @IsString() name: string;
  @IsString() surname: string;
  @IsOptional() @IsString() patronymic?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsNumber() country_id: number;
  @IsNumber() city_id: number;
  @IsOptional() @IsNumber() club_id?: number | null;
  @IsOptional() @IsString() pic?: string;
  @IsBoolean() is_male: boolean;
}
