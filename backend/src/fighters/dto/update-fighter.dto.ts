import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class UpdateFighterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() surname?: string;
  @IsOptional() @IsString() patronymic?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsNumber() country_id?: number;
  @IsOptional() @IsNumber() city_id?: number;
  @IsOptional() @IsNumber() club_id?: number | null;
  @IsOptional() @IsString() pic?: string;
  @IsOptional() @IsBoolean() is_male?: boolean;
}
