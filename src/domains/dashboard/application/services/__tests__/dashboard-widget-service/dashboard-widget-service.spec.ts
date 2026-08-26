import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardWidgetService } from '../../dashboard-widget-service';
import WidgetEntity from 'src/shared/infrastructure/database/entities/widget-entity';
import { DashboardHelperService } from '../../dashboard-helper-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardWidgetService', () => { 
  
  let service: DashboardWidgetService;
  let widgetRepo: jest.Mocked<Repository<WidgetEntity>>;
  let helperService: jest.Mocked<DashboardHelperService>;

  beforeEach(async () => {
    const mockWidgetRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockHelperService = {
      widgetMatchesNamespace: jest.fn(),
      normalizeWidgetNamespace: jest.fn(),
      serializeNullable: jest.fn(),
      safeJsonParse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardWidgetService,
        {
          provide: getRepositoryToken(WidgetEntity),
          useValue: mockWidgetRepo,
        },
        {
          provide: DashboardHelperService,
          useValue: mockHelperService,
        },
      ],
    }).compile();

    service = module.get<DashboardWidgetService>(DashboardWidgetService);
    widgetRepo = module.get(getRepositoryToken(WidgetEntity));
    helperService = module.get(DashboardHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWidgetsForUser', () => { 
  
    it('should return widgets that match namespace', async () => {
      const widgets = [{ id: '1' }, { id: '2' }] as any;
      widgetRepo.find.mockResolvedValue(widgets);
      helperService.widgetMatchesNamespace.mockImplementation((w: any) => w.id === '1');

      const result = await service.getWidgetsForUser('user-id', 'client');
      expect(widgetRepo.find).toHaveBeenCalledWith({
        where: expect.any(Object),
        order: { position: 'ASC' },
      });
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  describe('getOrCreateClientWidgets', () => { 
  
    it('should return existing widgets if any', async () => {
      const widgets = [{ id: '1' }] as any;
      jest.spyOn(service, 'getWidgetsForUser').mockResolvedValue(widgets);
      
      const result = await service.getOrCreateClientWidgets('user-id');
      expect(service.getWidgetsForUser).toHaveBeenCalledWith('user-id', 'client');
      expect(result).toEqual(widgets);
    });

    it('should create default widgets if none exist', async () => {
      jest.spyOn(service, 'getWidgetsForUser').mockResolvedValue([]);
      helperService.normalizeWidgetNamespace.mockImplementation((dto) => dto);
      jest.spyOn(service, 'createWidget').mockResolvedValue({ id: 'new-widget' } as any);
      
      const result = await service.getOrCreateClientWidgets('user-id');
      expect(service.createWidget).toHaveBeenCalledTimes(5); // 5 default widgets
      expect(result.length).toBe(5);
    });
  });

  describe('createWidget', () => { 
  
    it('should return existing widget if type exists', async () => {
      helperService.safeJsonParse.mockReturnValue({});
      helperService.normalizeWidgetNamespace.mockImplementation((dto) => dto);
      widgetRepo.findOne.mockResolvedValue({ id: 'existing' } as any);
      
      const result = await service.createWidget('user-id', { type: 'some_type' } as any);
      expect(widgetRepo.findOne).toHaveBeenCalled();
      expect(result).toEqual({ id: 'existing' });
    });

    it('should create and save new widget', async () => {
      helperService.safeJsonParse.mockReturnValue({});
      helperService.normalizeWidgetNamespace.mockImplementation((dto) => dto);
      widgetRepo.findOne.mockResolvedValue(null);
      widgetRepo.create.mockReturnValue({ id: 'new' } as any);
      widgetRepo.save.mockResolvedValue({ id: 'new' } as any);
      helperService.serializeNullable.mockImplementation((v) => v);
      
      const result = await service.createWidget('user-id', { title: 'Test' } as any);
      expect(widgetRepo.create).toHaveBeenCalled();
      expect(widgetRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'new' });
    });
  });

  describe('updateWidget', () => { 
  
    it('should update and return widget', async () => {
      widgetRepo.update.mockResolvedValue({} as any);
      widgetRepo.findOne.mockResolvedValue({ id: '1', title: 'New Title' } as any);
      helperService.safeJsonParse.mockReturnValue({});
      helperService.normalizeWidgetNamespace.mockImplementation((dto) => dto);
      helperService.serializeNullable.mockImplementation((v) => v);
      
      const result = await service.updateWidget('1', { title: 'New Title', configuration: {} } as any);
      expect(widgetRepo.update).toHaveBeenCalledWith({ id: '1' }, expect.any(Object));
      expect(result).toEqual({ id: '1', title: 'New Title' });
    });
  });

  describe('deleteWidget', () => { 
  
    it('should soft delete widget', async () => {
      widgetRepo.softDelete.mockResolvedValue({} as any);
      await service.deleteWidget('1');
      expect(widgetRepo.softDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('getWidgetById', () => { 
  
    it('should find one widget', async () => {
      widgetRepo.findOne.mockResolvedValue({ id: '1' } as any);
      const result = await service.getWidgetById('1');
      expect(widgetRepo.findOne).toHaveBeenCalledWith({ where: expect.any(Object) });
      expect(result).toEqual({ id: '1' });
    });
  });
});
