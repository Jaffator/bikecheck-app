import { Test, TestingModule } from '@nestjs/testing';
import { ComponentService } from './component.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ComponentService', () => {
  let service: ComponentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    component_types: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ComponentService>(ComponentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getComponentsFormOptions', () => {
    it('should return array of component form options', async () => {
      // ARRANGE
      const mockComponentTypes = [
        { id: 1, component_type: 'Fork', group_id: 1, ebike: false },
        { id: 2, component_type: 'Rear Shock', group_id: 1, ebike: false },
      ];
      mockPrismaService.component_types.findMany.mockResolvedValue(mockComponentTypes);

      // ACT
      const result = await service.getComponentsFormOptions();

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        component: {
          bike_id: 0,
          component_type_id: 1,
          component_desc: undefined,
          mounted_at: undefined,
          total_mileage_km: 0,
          is_active: false,
          note: '',
          interval_id: undefined,
          brake_load_since_service: undefined,
          last_serviced_at: undefined,
        },
        component_name: 'Fork',
      });
      expect(result[1].component_name).toBe('Rear Shock');
    });

    it('should return empty array when no component types exist', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([]);

      // ACT
      const result = await service.getComponentsFormOptions();

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should map all component types correctly', async () => {
      // ARRANGE
      const mockComponentTypes = [
        { id: 5, component_type: 'Chain', group_id: 2, ebike: false },
      ];
      mockPrismaService.component_types.findMany.mockResolvedValue(mockComponentTypes);

      // ACT
      const result = await service.getComponentsFormOptions();

      // ASSERT
      expect(result[0].component.component_type_id).toBe(5);
      expect(result[0].component_name).toBe('Chain');
      expect(result[0].component.bike_id).toBe(0);
      expect(result[0].component.total_mileage_km).toBe(0);
      expect(result[0].component.is_active).toBe(false);
    });

    it('should call prisma.component_types.findMany once', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([]);

      // ACT
      await service.getComponentsFormOptions();

      // ASSERT
      expect(mockPrismaService.component_types.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.component_types.findMany).toHaveBeenCalledWith({});
    });

    it('should handle prisma errors', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // ACT & ASSERT
      await expect(service.getComponentsFormOptions()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
