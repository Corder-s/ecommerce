import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) should return 200 with system health status', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.environment).toBeDefined();
        expect(res.body.uptime).toBeGreaterThanOrEqual(0);
        expect(res.body.checks.api).toBe('up');
      });
  });

  it('/api/v1/health/liveness (GET) should return 200 ok for liveness probe', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/liveness')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      });
  });

  it('/api/v1/health/readiness (GET) should return 200 ok for readiness probe', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/readiness')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.ready).toBe(true);
        expect(res.body.timestamp).toBeDefined();
      });
  });

  it('unmatched route should return 404 with correlation ID from exception filter', () => {
    return request(app.getHttpServer())
      .get('/api/v1/non-existent-route')
      .expect(404)
      .expect((res) => {
        expect(res.body.statusCode).toBe(404);
        expect(res.body.correlationId).toBeDefined();
        expect(res.headers['x-correlation-id']).toBeDefined();
      });
  });
});
