import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BLOCK_GROUP,
  LIFECYCLE_FIGHTS_EDITABLE,
  LIFECYCLE_RESULTS_FIXED,
} from '../competition.constants';
import { isFightResultsFixed } from '../competition.helpers';
import type {
  OlympicRoundPlan,
  ResultBlock,
  ResultFight,
  ResultSubmission,
} from './result-types';

@Injectable()
export class ResultSubmissionValidator {
  assertBlockEditable(block: ResultBlock) {
    if (block.status !== 'ACTIVE' || block.tournament_nomination.is_finished) {
      throw new BadRequestException('Block is locked');
    }
  }

  assertSaveAllowed(block: ResultBlock, submissions: ResultSubmission[]) {
    this.assertBlockEditable(block);
    if (
      block.type === BLOCK_GROUP
        ? block.lifecycle_state === LIFECYCLE_RESULTS_FIXED
        : submissions.some((submission) => {
            const fight = this.findFight(block.fights, submission.fight_id);
            return fight
              ? isFightResultsFixed({
                  ...fight,
                  bracket_round: fight.bracket_round ?? null,
                  is_bronze: fight.is_bronze ?? null,
                  block,
                })
              : false;
          })
    ) {
      throw new BadRequestException('Fight results are fixed');
    }
    if (!submissions.length) {
      throw new BadRequestException('No fight results to save');
    }
    this.assertBelongToBlock(block.fights, submissions);
  }

  assertFixBaseAllowed(block: ResultBlock, submissions: ResultSubmission[]) {
    this.assertBlockEditable(block);
    if (!submissions.length) {
      throw new BadRequestException('No fight results to record');
    }
    this.assertNoDuplicates(submissions);
    for (const submission of submissions) {
      if (!this.findFight(block.fights, submission.fight_id)) {
        throw new BadRequestException('Fight does not belong to the block');
      }
    }
  }

  assertGroupFixAllowed(block: ResultBlock, submissions: ResultSubmission[]) {
    if (block.lifecycle_state !== LIFECYCLE_FIGHTS_EDITABLE) {
      throw new BadRequestException('Group results cannot be fixed now');
    }
    const blockFightIds = new Set(block.fights.map((fight) => fight.id));
    if (
      !block.fights.length ||
      submissions.length !== block.fights.length ||
      submissions.some((submission) => !blockFightIds.has(submission.fight_id))
    ) {
      throw new BadRequestException(
        'All group fight results must be recorded together',
      );
    }
  }

  createOlympicRoundPlan(
    block: ResultBlock,
    round: number | undefined,
    submissions: ResultSubmission[],
    mainRounds: number,
  ): OlympicRoundPlan {
    if (!round) throw new BadRequestException('Olympic round is required');
    const state = block.round_states.find((item) => item.round === round);
    if (!state?.pairs_fixed || state.results_fixed) {
      throw new BadRequestException(
        'Olympic round results cannot be fixed now',
      );
    }
    const roundFights = block.fights.filter(
      (fight) =>
        fight.bracket_round === round ||
        (round === mainRounds && fight.is_bronze),
    );
    if (
      !roundFights.length ||
      submissions.length !== roundFights.length ||
      submissions.some(
        (submission) =>
          !roundFights.some((fight) => fight.id === submission.fight_id),
      )
    ) {
      throw new BadRequestException(
        'All Olympic round fight results must be recorded together',
      );
    }

    return { round, state, roundFights };
  }

  private assertBelongToBlock(
    fights: ResultFight[],
    submissions: ResultSubmission[],
  ) {
    this.assertNoDuplicates(submissions);
    const blockFightIds = new Set(fights.map((fight) => fight.id));
    if (
      submissions.some((submission) => !blockFightIds.has(submission.fight_id))
    ) {
      throw new BadRequestException('Fight does not belong to the block');
    }
  }

  private assertNoDuplicates(submissions: ResultSubmission[]) {
    const incomingFightIds = submissions.map(
      (submission) => submission.fight_id,
    );
    if (new Set(incomingFightIds).size !== incomingFightIds.length) {
      throw new BadRequestException('Fight results contain duplicates');
    }
  }

  private findFight(fights: ResultFight[], fightId: number) {
    return fights.find((fight) => fight.id === fightId);
  }
}
