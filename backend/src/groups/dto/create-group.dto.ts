import { IsNumber, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsNumber()
  tournament_id: number;

  @IsNumber()
  nomination_id: number;

  @IsString()
  name: string;

  @IsNumber()
  stage: number;
}
