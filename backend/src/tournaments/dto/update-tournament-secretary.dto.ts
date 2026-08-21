import { IsString, MaxLength } from 'class-validator';

export class UpdateTournamentSecretaryDto {
  @IsString()
  @MaxLength(255)
  secretary_name: string;
}
