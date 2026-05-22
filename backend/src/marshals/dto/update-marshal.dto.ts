import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMarshalDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() surname?: string;
  @IsOptional() @IsString() patronymic?: string;
  @IsOptional() @IsNumber() country_id?: number;
  @IsOptional() @IsNumber() city_id?: number;
  @IsOptional() @IsNumber() category_id?: number;
  @IsOptional() @IsString() pic?: string;
}
