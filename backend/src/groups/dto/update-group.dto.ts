import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateGroupDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  stage?: number;
}
