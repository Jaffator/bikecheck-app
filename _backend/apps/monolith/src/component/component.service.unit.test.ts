import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComponentService } from './component.service';
import { PrismaService } from '../../prisma/prisma.service';

const OWNER_ID = 7;
const BIKE_ID = 21;

// One Mounted Component as the read loads it: the part, the kind of part it is, the
// category that kind sits in, and every occasion work was recorded against it.
function mountedRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 55,
    bike_id: BIKE_ID,
    component_type_id: 12,
    component_desc: 'Fox 38 Factory Grip2',
    position: 'front',
    note: null,
    mounted_at: new Date('2024-04-01T00:00:00.000Z'),
    removed_at: null,
    is_active: true,
    total_km: 1200,
    total_time_min: 480,
    drivetrain_km: 0,
    suspension_min: 480,
    health_index: 85,
    component_types: {
      component_type: 'Fork',
      i18n_key: 'component.fork',
      component_group_id: 3,
      component_groups: { id: 3, group_name: 'Suspension', i18n_key: 'componentGroup.suspension', side_choice: true },
    },
    action_done_component_map: [],
    ...overrides,
  };
}

// A recorded occasion pointing at the part, dated so the read can pick the latest.
function serviceJunction(serviceDate: string, isDeleted = false): Record<string, unknown> {
  return {
    event_actions_done: { events_bikes: { service_date: new Date(serviceDate), is_deleted: isDeleted } },
  };
}

describe('ComponentService', () => {
  let service: ComponentService;

  const mockPrismaService = {
    component_types: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    events_action: {
      findFirst: jest.fn(),
    },
    event_action_targets: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    components_mounted: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bikes: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComponentService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ComponentService>(ComponentService);

    // The transaction is the same client to the caller, so the mock just runs the body.
    mockPrismaService.$transaction.mockImplementation(async (run: (tx: typeof mockPrismaService) => Promise<unknown>) =>
      run(mockPrismaService),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // The catalogue an owner picks a part from: what the app seeded, plus what they named
  // themselves. Another owner's part names are not theirs to see.
  describe('getComponentsDefaults', () => {
    function typeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
      return {
        id: 1,
        component_type: 'Fork',
        i18n_key: 'component.fork',
        component_group_id: 3,
        has_position: true,
        essential: true,
        ebike: false,
        user_id: null,
        ...overrides,
      };
    }

    it('offers seeded types and the caller own, and no other owner types', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([]);

      // ACT
      await service.getComponentsDefaults(false, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.component_types.findMany).toHaveBeenCalledWith({
        where: { ebike: false, OR: [{ user_id: null }, { user_id: OWNER_ID }] },
      });
    });

    it('keeps offering e-bike parts when the bike is an e-bike', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([]);

      // ACT
      await service.getComponentsDefaults(true, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.component_types.findMany).toHaveBeenCalledWith({
        where: { OR: [{ user_id: null }, { user_id: OWNER_ID }] },
      });
    });

    it('describes a type as the picker reads it', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([typeRow()]);

      // ACT
      const result = await service.getComponentsDefaults(false, OWNER_ID);

      // ASSERT
      expect(result).toEqual([
        {
          component: {
            bike_id: 0,
            component_type_id: 1,
            component_desc: null,
            mounted_at: undefined,
            total_km: 0,
            is_active: true,
            note: null,
            position: undefined,
            interval_id: undefined,
          },
          component_name: 'Fork',
          component_group_id: 3,
          component_i18n_key: 'component.fork',
          has_position: true,
          essential: true,
        },
      ]);
    });

    it('returns nothing when the catalogue is empty', async () => {
      // ARRANGE
      mockPrismaService.component_types.findMany.mockResolvedValue([]);

      // ACT
      const result = await service.getComponentsDefaults(false, OWNER_ID);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  // A type an owner names is theirs. Who owns it is read off the token, never off the body.
  // It also joins its category's catch-all Replacement, so Replace works on it (ADR 0018).
  describe('createComponentType', () => {
    const CUSTOM_TYPE = { component_group_id: 3, component_type: 'Dropper remote', ebike: false, has_position: false };

    it('makes the caller the owner of the type they name', async () => {
      // ARRANGE
      mockPrismaService.component_types.create.mockResolvedValue({ id: 91 });
      mockPrismaService.events_action.findFirst.mockResolvedValue(null);

      // ACT
      await service.createComponentType(CUSTOM_TYPE, 7);

      // ASSERT
      expect(mockPrismaService.component_types.create).toHaveBeenCalledWith({
        data: {
          component_type: 'Dropper remote',
          component_group_id: 3,
          user_id: 7,
          ebike: false,
          has_position: false,
        },
      });
    });

    it('binds the new type to its category catch-all Replacement', async () => {
      // ARRANGE
      mockPrismaService.component_types.create.mockResolvedValue({ id: 91 });
      mockPrismaService.events_action.findFirst.mockResolvedValue({ id: 44 });

      // ACT
      await service.createComponentType(CUSTOM_TYPE, 7);

      // ASSERT
      expect(mockPrismaService.event_action_targets.create).toHaveBeenCalledWith({
        data: { event_action_id: 44, component_type_id: 91 },
      });
    });

    it('still creates the type when the category has no catch-all Replacement', async () => {
      // ARRANGE
      mockPrismaService.component_types.create.mockResolvedValue({ id: 91, component_type: 'Dropper remote' });
      mockPrismaService.events_action.findFirst.mockResolvedValue(null);

      // ACT
      const created = await service.createComponentType(CUSTOM_TYPE, 7);

      // ASSERT
      expect(created).toEqual({ id: 91, component_type: 'Dropper remote' });
      expect(mockPrismaService.event_action_targets.create).not.toHaveBeenCalled();
    });

    it('answers with the created type, unchanged by the binding', async () => {
      // ARRANGE
      mockPrismaService.component_types.create.mockResolvedValue({ id: 91, component_type: 'Dropper remote' });
      mockPrismaService.events_action.findFirst.mockResolvedValue({ id: 44 });

      // ACT
      const created = await service.createComponentType(CUSTOM_TYPE, 7);

      // ASSERT
      expect(created).toEqual({ id: 91, component_type: 'Dropper remote' });
    });
  });

  // The build of one bike, as the components section reads it.
  describe('getBikeComponents', () => {
    it('refuses a bike the caller does not own', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.getBikeComponents(BIKE_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.components_mounted.findMany).not.toHaveBeenCalled();
    });

    it('names the part, its category and the wear it carries', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([
        mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z')] }),
      ]);

      // ACT
      const [part] = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(part).toEqual({
        id: 55,
        bike_id: BIKE_ID,
        component_type_id: 12,
        component_type: 'Fork',
        component_type_i18n_key: 'component.fork',
        component_group_id: 3,
        component_group: 'Suspension',
        component_group_i18n_key: 'componentGroup.suspension',
        side_choice: true,
        component_desc: 'Fox 38 Factory Grip2',
        position: 'front',
        note: null,
        mounted_at: new Date('2024-04-01T00:00:00.000Z'),
        removed_at: null,
        is_active: true,
        total_km: 1200,
        total_time_min: 480,
        drivetrain_km: 0,
        suspension_min: 480,
        health_index: 85,
        last_service_at: new Date('2025-06-10T00:00:00.000Z'),
        unserviced: false,
      });
    });

    it('dates a part by the most recent work recorded against it', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([
        mountedRow({
          action_done_component_map: [
            serviceJunction('2025-06-10T00:00:00.000Z'),
            serviceJunction('2025-09-01T00:00:00.000Z'),
            serviceJunction('2024-01-05T00:00:00.000Z'),
          ],
        }),
      ]);

      // ACT
      const [part] = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(part.last_service_at).toEqual(new Date('2025-09-01T00:00:00.000Z'));
    });

    it('does not date a part by a Service that was deleted', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([
        mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z', true)] }),
      ]);

      // ACT
      const [part] = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(part.last_service_at).toBeNull();
    });

    it('marks a part no recorded work points at as Unserviced', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([mountedRow()]);

      // ACT
      const [part] = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(part.unserviced).toBe(true);
      expect(part.last_service_at).toBeNull();
    });

    it('marks a part recorded work points at as no longer Unserviced', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([
        mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z')] }),
      ]);

      // ACT
      const [part] = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(part.unserviced).toBe(false);
    });

    it('reads the build and the parts taken off it, but nothing deleted', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.findMany.mockResolvedValue([
        mountedRow(),
        mountedRow({ id: 56, is_active: false, removed_at: new Date('2025-02-02T00:00:00.000Z') }),
      ]);

      // ACT
      const parts = await service.getBikeComponents(BIKE_ID, OWNER_ID);

      // ASSERT
      expect(parts.map((part) => part.id)).toEqual([55, 56]);
      expect(parts[1].removed_at).toEqual(new Date('2025-02-02T00:00:00.000Z'));
      expect(mockPrismaService.components_mounted.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { bike_id: BIKE_ID, is_deleted: { not: true } } }),
      );
    });
  });

  // Adding a part to a bike that already exists: the way back to a part forgotten at bike
  // creation. No Wear Baseline is written and no Service is created (ADR 0015).
  describe('createMountedComponent', () => {
    it('adds a part to the caller bike from its type alone', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.create.mockResolvedValue(mountedRow());

      // ACT
      await service.createMountedComponent({ bike_id: BIKE_ID, component_type_id: 12 }, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            bike_id: BIKE_ID,
            component_type_id: 12,
            component_desc: null,
            position: null,
            note: null,
            mounted_at: undefined,
            total_km: undefined,
            total_time_min: undefined,
          },
        }),
      );
    });

    it('stores the description, position, starting wear and mounted date it is given', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.create.mockResolvedValue(mountedRow());

      // ACT
      await service.createMountedComponent(
        {
          bike_id: BIKE_ID,
          component_type_id: 12,
          component_desc: 'Fox 38 Factory Grip2',
          position: 'front',
          mounted_at: new Date('2024-04-01T00:00:00.000Z'),
          total_km: 2000,
          total_time_min: 600,
        },
        OWNER_ID,
      );

      // ASSERT
      expect(mockPrismaService.components_mounted.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            bike_id: BIKE_ID,
            component_type_id: 12,
            component_desc: 'Fox 38 Factory Grip2',
            position: 'front',
            note: null,
            mounted_at: new Date('2024-04-01T00:00:00.000Z'),
            total_km: 2000,
            total_time_min: 600,
          },
        }),
      );
    });

    it('reads the new part back the way the section renders it', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue({ id: BIKE_ID });
      mockPrismaService.components_mounted.create.mockResolvedValue(mountedRow());

      // ACT
      const part = await service.createMountedComponent({ bike_id: BIKE_ID, component_type_id: 12 }, OWNER_ID);

      // ASSERT
      expect(part.component_type).toBe('Fork');
      expect(part.component_group).toBe('Suspension');
      expect(part.unserviced).toBe(true);
    });

    it('refuses a bike the caller does not own', async () => {
      // ARRANGE
      mockPrismaService.bikes.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.createMountedComponent({ bike_id: BIKE_ID, component_type_id: 12 }, OWNER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.components_mounted.create).not.toHaveBeenCalled();
    });
  });

  // Correcting a part. What may be corrected is decided by its service history alone,
  // and by the server as well as the screen (ADR 0016).
  describe('updateMountedComponent', () => {
    const COMPONENT_ID = 55;
    const hardened = mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z')] });

    it('corrects the description and position of a part a Service has touched', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(hardened);
      mockPrismaService.components_mounted.update.mockResolvedValue(hardened);

      // ACT
      await service.updateMountedComponent(
        COMPONENT_ID,
        { component_desc: 'Fox 38 Performance', position: 'rear' },
        OWNER_ID,
      );

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: COMPONENT_ID },
          data: expect.objectContaining({ component_desc: 'Fox 38 Performance', position: 'rear' }),
        }),
      );
    });

    it('refuses to rewrite the wear of a part a Service has touched', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(hardened);

      // ACT & ASSERT
      await expect(service.updateMountedComponent(COMPONENT_ID, { total_km: 2000 }, OWNER_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });

    it('refuses to rewrite the mounted date of a part a Service has touched', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(hardened);

      // ACT & ASSERT
      await expect(
        service.updateMountedComponent(COMPONENT_ID, { mounted_at: new Date('2023-01-01T00:00:00.000Z') }, OWNER_ID),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });

    it('says why a hardened part refuses the correction', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(hardened);

      // ACT & ASSERT
      await expect(service.updateMountedComponent(COMPONENT_ID, { total_km: 2000 }, OWNER_ID)).rejects.toThrow(
        /serviced/i,
      );
    });

    it('corrects the wear and mounted date of an Unserviced part', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(mountedRow());
      mockPrismaService.components_mounted.update.mockResolvedValue(mountedRow());

      // ACT
      await service.updateMountedComponent(
        COMPONENT_ID,
        { total_km: 2000, total_time_min: 900, mounted_at: new Date('2023-01-01T00:00:00.000Z') },
        OWNER_ID,
      );

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_km: 2000,
            total_time_min: 900,
            mounted_at: new Date('2023-01-01T00:00:00.000Z'),
          }),
        }),
      );
    });

    it('refuses a component on a bike the caller does not own', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateMountedComponent(COMPONENT_ID, { component_desc: 'Mine now' }, OWNER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });

    it('looks the part up through its owner', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(mountedRow());
      mockPrismaService.components_mounted.update.mockResolvedValue(mountedRow());

      // ACT
      await service.updateMountedComponent(COMPONENT_ID, { component_desc: 'Fox 38' }, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: COMPONENT_ID,
            is_deleted: { not: true },
            bikes: { user_id: OWNER_ID, is_deleted: { not: true } },
          },
        }),
      );
    });
  });

  // Taking a part off with nothing fitted in its place. It stops accumulating and keeps
  // everything it did — no Wear Baseline is touched (ADR 0015).
  describe('dismountComponent', () => {
    const COMPONENT_ID = 55;

    it('records the day the part came off and stops it accumulating', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(mountedRow());
      mockPrismaService.components_mounted.update.mockResolvedValue(mountedRow());

      // ACT
      await service.dismountComponent(COMPONENT_ID, { removed_at: new Date('2025-02-02T00:00:00.000Z') }, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: COMPONENT_ID },
          data: expect.objectContaining({ is_active: false, removed_at: new Date('2025-02-02T00:00:00.000Z') }),
        }),
      );
    });

    it('takes a part off today when no day is given', async () => {
      // ARRANGE
      jest.useFakeTimers().setSystemTime(new Date('2026-09-02T08:00:00.000Z'));
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(mountedRow());
      mockPrismaService.components_mounted.update.mockResolvedValue(mountedRow());

      // ACT
      await service.dismountComponent(COMPONENT_ID, {}, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_active: false, removed_at: new Date('2026-09-02T08:00:00.000Z') }),
        }),
      );
      jest.useRealTimers();
    });

    it('takes a part a Service has touched off just the same', async () => {
      // ARRANGE
      const hardened = mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z')] });
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(hardened);
      mockPrismaService.components_mounted.update.mockResolvedValue(hardened);

      // ACT
      await service.dismountComponent(COMPONENT_ID, { removed_at: new Date('2025-07-01T00:00:00.000Z') }, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_active: false, removed_at: new Date('2025-07-01T00:00:00.000Z') }),
        }),
      );
    });

    it('refuses a component on a bike the caller does not own', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.dismountComponent(COMPONENT_ID, {}, OWNER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });
  });

  // The way back out of a row that should never have existed. Only offered while nothing
  // has recorded work against it (ADR 0016).
  describe('deleteMountedComponent', () => {
    const COMPONENT_ID = 55;

    it('soft-deletes an Unserviced part so it leaves the build and the dismounted parts alike', async () => {
      // ARRANGE
      jest.useFakeTimers().setSystemTime(new Date('2026-09-02T08:00:00.000Z'));
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(mountedRow());
      mockPrismaService.components_mounted.update.mockResolvedValue(mountedRow());

      // ACT
      await service.deleteMountedComponent(COMPONENT_ID, OWNER_ID);

      // ASSERT
      expect(mockPrismaService.components_mounted.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: COMPONENT_ID },
          data: expect.objectContaining({ is_deleted: true, deleted_at: new Date('2026-09-02T08:00:00.000Z') }),
        }),
      );
      jest.useRealTimers();
    });

    it('refuses to delete a part a Service has touched', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(
        mountedRow({ action_done_component_map: [serviceJunction('2025-06-10T00:00:00.000Z')] }),
      );

      // ACT & ASSERT
      await expect(service.deleteMountedComponent(COMPONENT_ID, OWNER_ID)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });

    it('refuses a component on a bike the caller does not own', async () => {
      // ARRANGE
      mockPrismaService.components_mounted.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.deleteMountedComponent(COMPONENT_ID, OWNER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.components_mounted.update).not.toHaveBeenCalled();
    });
  });
});
