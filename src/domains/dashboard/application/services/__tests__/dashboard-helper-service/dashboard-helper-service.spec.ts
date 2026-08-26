import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { USER_TYPE } from 'src/shared/common';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { Repository } from 'typeorm';
import { DashboardHelperService } from '../../dashboard-helper-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardHelperService', () => { 
  
  let service: DashboardHelperService;
  let userCompanyRepo: jest.Mocked<Repository<UserCompanyEntity>>;
  let userRepo: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const mockUserCompanyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    };

    const mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardHelperService,
        {
          provide: getRepositoryToken(UserCompanyEntity),
          useValue: mockUserCompanyRepo,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<DashboardHelperService>(DashboardHelperService);
    userCompanyRepo = module.get(getRepositoryToken(UserCompanyEntity));
    userRepo = module.get(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('safeJsonParse', () => { 
  
    it('should return null for null/undefined', () => {
      expect(service.safeJsonParse(null)).toBeNull();
      expect(service.safeJsonParse(undefined)).toBeNull();
    });
    it('should return object as is', () => {
      const obj = { key: 'value' };
      expect(service.safeJsonParse(obj)).toBe(obj);
    });
    it('should parse valid JSON string', () => {
      expect(service.safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
    });
    it('should return string as is if invalid JSON', () => {
      expect(service.safeJsonParse('invalid json')).toBe('invalid json');
    });
    it('should return null for empty string', () => {
      expect(service.safeJsonParse('   ')).toBeNull();
    });
  });

  describe('normalizeWidgetNamespace', () => { 
  
    it('should return dto if no namespace provided', () => {
      const dto = { title: 'Test' };
      expect(service.normalizeWidgetNamespace(dto)).toBe(dto);
    });
    it('should build payload with undefined filter if partial.filter is missing', () => {
      const partial = { title: 'Test' } as any;
      const payload = service.normalizeWidgetNamespace(partial, 'CLIENT' as any);
      expect(payload.filter).toEqual({ namespace: 'CLIENT' });
    });
    it('should add namespace to existing filter object', () => {
      const dto = { title: 'Test', filter: { some: 'value' } } as any;
      expect(service.normalizeWidgetNamespace(dto, 'CLIENT' as any)).toEqual({
        title: 'Test',
        filter: { some: 'value', namespace: 'CLIENT' },
      });
    });
    it('should handle string filter', () => {
      const dto = { title: 'Test', filter: '{"some":"value"}' };
      expect(service.normalizeWidgetNamespace(dto, 'CLIENT' as any)).toEqual({
        title: 'Test',
        filter: { some: 'value', namespace: 'CLIENT' },
      });
    });
  });

  describe('widgetMatchesNamespace', () => { 
  
    it('should return true if no namespace provided', () => {
      const widget = { filter: '{"namespace":"ADMIN"}' } as any;
      expect(service.widgetMatchesNamespace(widget)).toBe(true);
    });
    it('should return true if widget has no namespace', () => {
      const widget = { filter: '{"some":"value"}' } as any;
      expect(service.widgetMatchesNamespace(widget, 'CLIENT' as any)).toBe(true);
    });
    it('should return true if namespaces match', () => {
      const widget = { filter: '{"namespace":"CLIENT"}' } as any;
      expect(service.widgetMatchesNamespace(widget, 'CLIENT' as any)).toBe(true);
    });
    it('should return false if namespaces do not match', () => {
      const widget = { filter: '{"namespace":"ADMIN"}' } as any;
      expect(service.widgetMatchesNamespace(widget, 'CLIENT' as any)).toBe(false);
    });
  });

  describe('serializeNullable', () => { 
  
    it('should handle null/undefined', () => {
      expect(service.serializeNullable(null)).toBeNull();
      expect(service.serializeNullable(undefined)).toBeNull();
    });
    it('should stringify objects', () => {
      expect(service.serializeNullable({ key: 'val' })).toBe('{"key":"val"}');
    });
    it('should return primitives as is', () => {
      expect(service.serializeNullable('string')).toBe('string');
      expect(service.serializeNullable(123)).toBe(123);
    });
  });

  describe('getEffectiveRange', () => { 
  
    it('should use default from and to if not provided', () => {
      const res = service.getEffectiveRange();
      expect(res.from).toBe('1900-01-01');
      expect(res.to).toMatch(/\d{4}-\d{2}-\d{2} 23:59:59/);
    });
    it('should append 23:59:59 to dateTo', () => {
      const res = service.getEffectiveRange({ from: '2023-01-01', to: '2023-12-31' });
      expect(res.from).toBe('2023-01-01');
      expect(res.to).toBe('2023-12-31 23:59:59');
    });
  });

  describe('getCompanyIdForUser', () => { 
  
    it('should return companyId if found', async () => {
      userCompanyRepo.findOne.mockResolvedValue({ companyId: 'comp-1' } as any);
      const res = await service.getCompanyIdForUser('user-1');
      expect(res).toBe('comp-1');
    });
  });

  describe('resolveUserScope', () => { 
  
    it('should return all users if isAdmin and no companyId', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        type: USER_TYPE.ADMINISTRATOR,
      } as any);
      userRepo.find.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }] as any);
      const res = await service.resolveUserScope({
        userId: 'u1',
        isAdmin: undefined,
        companyId: undefined,
      });
      expect(res).toEqual(['u1', 'u2']);
    });
    it('should return users in company if isAdmin and companyId provided', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        type: USER_TYPE.ADMINISTRATOR,
      } as any);
      userCompanyRepo.find.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as any);
      const res = await service.resolveUserScope({
        userId: 'u1',
        isAdmin: true,
        companyId: 'comp-1',
      });
      expect(res).toEqual(['u1', 'u2']);
    });
    it('should return single userId if not admin', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        type: USER_TYPE.INDIVIDUAL,
        userCompanies: [
          {
            id: 'uc1',
            userId: 'u1',
          },
        ],
        userRoles: [{ id: 'ur1', role: { id: 'r1', name: 'Individual' } }],
      } as any);
      const res = await service.resolveUserScope({
        userId: 'u1',
        isAdmin: false,
        companyId: undefined,
      });
      expect(res).toEqual(['u1']);
    });
    it('should return empty array if no user or admin', async () => {
      const res = await service.resolveUserScope({
        userId: undefined,
        isAdmin: false,
        companyId: undefined,
      });
      expect(res).toEqual([]);
    });
  });

  describe('resolveCompanyIdByName', () => { 
  
    it('should return null if no companyName', async () => {
      expect(await service.resolveCompanyIdByName('')).toBeNull();
    });
    it('should return companyId if found', async () => {
      (userCompanyRepo.manager.findOne as jest.Mock).mockResolvedValue({ id: 'comp-1' });
      expect(await service.resolveCompanyIdByName('My Comp')).toBe('comp-1');
    });
  });
});
