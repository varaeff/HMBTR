import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsString()
  patronymic?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  is_admin?: boolean;

  @IsOptional()
  @IsBoolean()
  is_organizer?: boolean;
}
