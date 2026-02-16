import {
  IsString,
  IsInt,
  IsPositive,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateClubDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsInt()
  @IsPositive()
  city_id: number;
}
