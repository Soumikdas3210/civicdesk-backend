import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns a status and a name', () => {
      expect(appController.health()).toEqual({
        status: 'ok',
        name: 'CivicDesk API',
      });
    });

    it('says nothing about the environment or the stack', () => {
      const keys = Object.keys(appController.health());
      expect(keys).toEqual(['status', 'name']);
    });
  });
});