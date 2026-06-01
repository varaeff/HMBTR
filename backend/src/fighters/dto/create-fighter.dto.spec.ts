import { validate } from 'class-validator';
import { CreateFighterDto } from './create-fighter.dto';

describe('CreateFighterDto', () => {
  it('allows creating a fighter without a club', async () => {
    const dto = new CreateFighterDto();
    dto.name = 'Ivan';
    dto.surname = 'Ivanov';
    dto.country_id = 1;
    dto.city_id = 2;
    dto.is_male = true;

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('club_id');
  });
});
