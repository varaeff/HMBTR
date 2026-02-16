import { Test, TestingModule } from '@nestjs/testing';
import { FightersController } from './fighters.controller';

describe('FightersController', () => {
  let controller: FightersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FightersController],
    }).compile();

    controller = module.get<FightersController>(FightersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
