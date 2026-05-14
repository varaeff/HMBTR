import { IsArray, IsNumber, IsString } from 'class-validator';

export class GenerateGroupFightsGroupDto {
  @IsString()
  letter: string;

  @IsArray()
  competitor_ids: number[];
}

export class GenerateGroupFightsDto {
  @IsNumber()
  block_id: number;

  @IsArray()
  groups: GenerateGroupFightsGroupDto[];
}
