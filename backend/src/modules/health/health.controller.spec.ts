import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              environment: 'test',
              database: { url: 'postgresql://localhost:5432/test' },
              redis: { url: undefined },
            }),
          ],
        }),
      ],
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return valid health check payload', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.environment).toBe('test');
      expect(result.version).toBe('0.1.0');
      expect(typeof result.uptime).toBe('number');
      expect(result.checks.api).toBe('up');
      expect(result.checks.database).toBe('configured');
      expect(result.checks.redis).toBe('not_configured');
      expect(result.memory).toHaveProperty('rssMb');
      expect(result.memory).toHaveProperty('heapUsedMb');
    });
  });

  describe('getLiveness', () => {
    it('should return ok and uptime', () => {
      const result = controller.getLiveness();

      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReadiness', () => {
    it('should return ok and ready: true', () => {
      const result = controller.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.ready).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });
});
