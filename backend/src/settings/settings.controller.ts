import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { SettingsService } from './settings.service';
import { UpdateDisciplinaryCardSettingsDto } from './dto/update-disciplinary-card-settings.dto';

interface RequestUser {
  is_admin?: boolean;
}

@Controller(API_ROUTES.SETTINGS.ROOT)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(API_ROUTES.SETTINGS.DISCIPLINARY_CARDS)
  getDisciplinaryCardSettings(@Req() req: { user?: RequestUser }) {
    this.requireAdmin(req.user);

    return this.settingsService.getDisciplinaryCardSettings();
  }

  @Patch(API_ROUTES.SETTINGS.DISCIPLINARY_CARDS)
  updateDisciplinaryCardSettings(
    @Body() dto: UpdateDisciplinaryCardSettingsDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAdmin(req.user);

    return this.settingsService.updateDisciplinaryCardSettings(dto);
  }

  private requireAdmin(user?: RequestUser) {
    if (!user?.is_admin) {
      throw new ForbiddenException('Administrator access required');
    }
  }
}
