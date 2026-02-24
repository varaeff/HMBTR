import { Test, TestingModule } from '@nestjs/testing';
import { NominationsController } from './nominations.controller';

describe('NominationsController', () => {
  let controller: NominationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NominationsController],
    }).compile();

    controller = module.get<NominationsController>(NominationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
