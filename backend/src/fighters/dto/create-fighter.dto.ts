import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateFighterDto {
  @IsString() name: string;
  @IsString() surname: string;
  @IsOptional() @IsString() patronymic?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsNumber() country_id: number;
  @IsNumber() city_id: number;
  @IsNumber() club_id: number;
  @IsOptional() @IsString() pic?: string;
}
