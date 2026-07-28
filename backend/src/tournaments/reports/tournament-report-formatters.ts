import type {
  CardFight,
  FighterName,
  MarshalCategory,
  NominationDefinition,
} from '../tournaments-internal.types';
import type { ReportCopy } from './tournament-report-copy';

export const getMarshalCategoryName = (
  category: MarshalCategory,
  language: string,
) => (language === 'ru' ? category.name_ru : category.name_en);

export const getCardTypeLabel = (type: string, copy: ReportCopy) =>
  type === 'RED' ? copy.redCard : copy.yellowCard;

export const getCardFightLabel = (fight: CardFight) => `#${fight.fight_number}`;

export const getNominationName = (
  nomination: NominationDefinition,
  language: string,
) => (language === 'ru' ? nomination.name_ru : nomination.name_en);

export const formatDate = (
  date: Date | string | null,
  fallback = 'Not set',
) => {
  if (!date) return fallback;
  return new Date(date).toISOString().slice(0, 10);
};

export const formatFighterName = (fighter: FighterName) =>
  [fighter.surname, fighter.name, fighter.patronymic].filter(Boolean).join(' ');

export const getGroupFighterWord = (
  count: number,
  language: string,
  copy: ReportCopy,
) => {
  if (language !== 'ru') return copy.fighter.toLowerCase();

  return count === 3 || count === 4 ? 'бойца' : 'бойцов';
};
