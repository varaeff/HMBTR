import {
  IsString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsISO8601,
} from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsISO8601()
  event_date: string;

  @IsNumber()
  country_id: number;

  @IsNumber()
  city_id: number;
}
