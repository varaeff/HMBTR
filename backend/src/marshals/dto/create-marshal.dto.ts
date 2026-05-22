import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMarshalDto {
  @IsString() name: string;
  @IsString() surname: string;
  @IsOptional() @IsString() patronymic?: string;
  @IsNumber() country_id: number;
  @IsNumber() city_id: number;
  @IsNumber() category_id: number;
  @IsOptional() @IsString() pic?: string;
}
