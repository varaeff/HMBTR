import { IsString, MaxLength } from 'class-validator';

export class UpdateMinsportReportSettingsDto {
  @IsString()
  @MaxLength(2000)
  organization_name: string;

  @IsString()
  @MaxLength(2000)
  organization_address: string;
}
