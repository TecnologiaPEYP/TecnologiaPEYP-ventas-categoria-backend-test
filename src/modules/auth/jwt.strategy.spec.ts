import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user payload with role and permissions', async () => {
    const payload = { sub: 1, email: 'test@example.com', role: 'empleado', permissions: ['dashboard:view', 'profile:view'] };
    const result = await strategy.validate(payload);
    
    expect(result).toEqual({
      userId: 1,
      email: 'test@example.com',
      role: 'empleado',
      permissions: ['dashboard:view', 'profile:view'],
    });
  });

  it('should default permissions to empty array when not in payload', async () => {
    const payload = { sub: 2, email: 'old@example.com', role: 'user' };
    const result = await strategy.validate(payload);
    
    expect(result).toEqual({
      userId: 2,
      email: 'old@example.com',
      role: 'user',
      permissions: [],
    });
  });
});
