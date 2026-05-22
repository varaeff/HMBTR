import { IsNumber } from 'class-validator';

export class AddTournamentMarshalDto {
  @IsNumber() tournament_id: number;
  @IsNumber() marshal_id: number;
}
