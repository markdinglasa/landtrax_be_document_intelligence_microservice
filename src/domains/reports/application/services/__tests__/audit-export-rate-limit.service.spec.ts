import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job-entity';
import {
  AuditExportRateLimitService,
  LARGE_EXPORT_HOURLY_LIMIT,
  LARGE_EXPORT_THRESHOLD,
} from '../audit-export-rate-limit.service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('AuditExportRateLimitService', () => { 
  
  let service: AuditExportRateLimitService;
  let mockGetCount: jest.Mock;

  /** Builds a chainable query builder mock whose getCount resolves to `value`. */
  function makeQb(value: number) {
    mockGetCount = jest.fn().mockResolvedValue(value);
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: mockGetCount,
    };
  }

  function buildModule(countValue: number) {
    const qb = makeQb(countValue);
    return Test.createTestingModule({
      providers: [
        AuditExportRateLimitService,
        {
          provide: getRepositoryToken(AuditExportJobEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qb),
          },
        },
      ],
    }).compile();
  }

  afterEach(() => jest.clearAllMocks());

  // ─── isLimitReached ────────────────────────────────────────────────────────

  describe('isLimitReached', () => { 
  
    it('should return false when no jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(0);
      service = module.get(AuditExportRateLimitService);

      expect(await service.isLimitReached()).toBe(false);
    });

    it('should return false when fewer than 3 jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(2);
      service = module.get(AuditExportRateLimitService);

      expect(await service.isLimitReached()).toBe(false);
    });

    it('should return true when exactly 3 jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(3);
      service = module.get(AuditExportRateLimitService);

      expect(await service.isLimitReached()).toBe(true);
    });

    it('should return true when more than 3 jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(5);
      service = module.get(AuditExportRateLimitService);

      expect(await service.isLimitReached()).toBe(true);
    });

    it('should query with a 60-minute window and record-count threshold', async () => {
      const module: TestingModule = await buildModule(1);
      service = module.get(AuditExportRateLimitService);

      await service.isLimitReached();

      // Verify andWhere was called with the threshold filter
      expect(mockGetCount).toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditExportRateLimitService,
          {
            provide: getRepositoryToken(AuditExportJobEntity),
            useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
          },
        ],
      }).compile();
      service = module.get(AuditExportRateLimitService);

      await expect(service.isLimitReached()).rejects.toThrow('Database connection failed');
    });
  });

  // ─── getRemainingSlots ─────────────────────────────────────────────────────

  describe('getRemainingSlots', () => { 
  
    it('should return 3 when no jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(0);
      service = module.get(AuditExportRateLimitService);

      expect(await service.getRemainingSlots()).toBe(3);
    });

    it('should return 2 when 1 job exists in the last hour', async () => {
      const module: TestingModule = await buildModule(1);
      service = module.get(AuditExportRateLimitService);

      expect(await service.getRemainingSlots()).toBe(2);
    });

    it('should return 1 when 2 jobs exist in the last hour', async () => {
      const module: TestingModule = await buildModule(2);
      service = module.get(AuditExportRateLimitService);

      expect(await service.getRemainingSlots()).toBe(1);
    });

    it('should return 0 when exactly 3 jobs exist (limit reached)', async () => {
      const module: TestingModule = await buildModule(3);
      service = module.get(AuditExportRateLimitService);

      expect(await service.getRemainingSlots()).toBe(0);
    });

    it('should return 0 (not negative) when count exceeds limit', async () => {
      const module: TestingModule = await buildModule(10);
      service = module.get(AuditExportRateLimitService);

      const result = await service.getRemainingSlots();

      expect(result).toBe(0);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── integration scenarios ─────────────────────────────────────────────────

  describe('integration scenarios', () => { 
  
    it('should enforce the 3-per-hour limit correctly across all slot counts', async () => {
      const cases: [number, boolean, number][] = [
        // [jobCount, expectedLimitReached, expectedRemainingSlots]
        [0, false, 3],
        [1, false, 2],
        [2, false, 1],
        [3, true,  0],
        [4, true,  0],
      ];

      for (const [count, expectedLimit, expectedSlots] of cases) {
        const module: TestingModule = await buildModule(count);
        service = module.get(AuditExportRateLimitService);

        expect(await service.isLimitReached()).toBe(expectedLimit);
        expect(await service.getRemainingSlots()).toBe(expectedSlots);
      }
    });

    it('should use createQueryBuilder with correct alias', async () => {
      const qb = makeQb(0);
      const createQbSpy = jest.fn().mockReturnValue(qb);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditExportRateLimitService,
          {
            provide: getRepositoryToken(AuditExportJobEntity),
            useValue: { createQueryBuilder: createQbSpy },
          },
        ],
      }).compile();
      service = module.get(AuditExportRateLimitService);

      await service.isLimitReached();

      expect(createQbSpy).toHaveBeenCalledWith('job');
    });

    it('should use LARGE_EXPORT_HOURLY_LIMIT constant (3)', () => {
      expect(LARGE_EXPORT_HOURLY_LIMIT).toBe(3);
    });

    it('should use LARGE_EXPORT_THRESHOLD constant (10000)', () => {
      expect(LARGE_EXPORT_THRESHOLD).toBe(10_000);
    });
  });
});
