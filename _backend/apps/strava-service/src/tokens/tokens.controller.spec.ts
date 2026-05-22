import { Test, TestingModule } from '@nestjs/testing';
import { TokenController } from './tokens.controller';
import { TokenService } from './tokens.service';

describe('TokenController', () => {
  let controller: TokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenController],
      providers: [TokenService],
    }).compile();

    controller = module.get<TokenController>(TokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
