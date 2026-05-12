import { IsNumber } from 'class-validator';

export class UpdateNominationStageDto {
  @IsNumber()
  nomination_id: number;

  @IsNumber()
  stage: number;
}
