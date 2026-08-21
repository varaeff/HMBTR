import { Injectable } from '@nestjs/common';
import { AddNominationDto } from './dto/add-nomination.dto';
import { AddTournamentMarshalDto } from './dto/add-tournament-marshal.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateNominationStageDto } from './dto/update-nomination-stage.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { UpdateTournamentSecretaryDto } from './dto/update-tournament-secretary.dto';
import { TournamentCrudService } from './core/tournament-crud.service';
import { TournamentMarshalService } from './marshals/tournament-marshal.service';
import { TournamentNominationService } from './nominations/tournament-nomination.service';
import { TournamentReportService } from './reports/tournament-report.service';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly crud: TournamentCrudService,
    private readonly nominations: TournamentNominationService,
    private readonly marshals: TournamentMarshalService,
    private readonly reports: TournamentReportService,
  ) {}

  async findAll() {
    return this.crud.findAll();
  }

  async getCount() {
    return this.crud.getCount();
  }

  async findOne(id: number) {
    return this.crud.findOne(id);
  }

  async create(dto: CreateTournamentDto) {
    return this.crud.create(dto);
  }

  async getNominations(tournamentId: number) {
    return this.nominations.getNominations(tournamentId);
  }

  async addNomination(dto: AddNominationDto) {
    return this.nominations.addNomination(dto);
  }

  async updateNomination(dto: UpdateNominationDto) {
    return this.nominations.updateNomination(dto);
  }

  async deleteNomination(tournamentId: number, nominationId: number) {
    return this.nominations.deleteNomination(tournamentId, nominationId);
  }

  async updateNominationStage(dto: UpdateNominationStageDto) {
    return this.nominations.updateNominationStage(dto);
  }

  async getTournamentMarshals(tournamentId: number) {
    return this.marshals.getTournamentMarshals(tournamentId);
  }

  async addTournamentMarshal(dto: AddTournamentMarshalDto) {
    return this.marshals.addTournamentMarshal(dto);
  }

  async deleteTournamentMarshal(id: number) {
    return this.marshals.deleteTournamentMarshal(id);
  }

  async setChiefTournamentMarshal(id: number) {
    return this.marshals.setChiefTournamentMarshal(id);
  }

  async updateTournamentSecretary(
    tournamentId: number,
    dto: UpdateTournamentSecretaryDto,
  ) {
    return this.marshals.updateTournamentSecretary(tournamentId, dto);
  }

  async getTournamentReport(tournamentId: number, language = 'en') {
    return this.reports.getTournamentReport(tournamentId, language);
  }
}
