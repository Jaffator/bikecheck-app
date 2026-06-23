import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, reports } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REPORT_SNAPSHOT_VERSION, ReportSnapshot, ReportComponent, ReportServiceEvent } from './report.types';

// What we load from the bike to build a snapshot. Kept as a constant so the
// payload type below stays in sync with the actual query.
const reportBikeInclude = {
  bike_types: true,
  components_mounted: {
    where: { is_active: true, is_deleted: false },
    include: { component_types: true },
  },
  events_bikes: {
    where: { is_deleted: false },
    include: { event_actions_done: { include: { events_action: true } } },
    orderBy: { created_at: 'desc' },
  },
} satisfies Prisma.bikesInclude;

type ReportBikeWithRelations = Prisma.bikesGetPayload<{ include: typeof reportBikeInclude }>;

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, bikeId: number): Promise<reports> {
    const bike = await this.prisma.bikes.findFirst({
      where: { id: bikeId, user_id: userId, is_deleted: false },
      include: reportBikeInclude,
    });
    if (!bike) {
      throw new NotFoundException(`Bike with ID ${bikeId} not found`);
    }

    const snapshot = this.buildSnapshot(bike);

    return this.prisma.reports.create({
      data: {
        public_token: randomUUID(),
        user_id: userId,
        bike_id: bikeId,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
      },
    });
  }

  async listMine(userId: number): Promise<reports[]> {
    return await this.prisma.reports.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async listForBike(userId: number, bikeId: number): Promise<reports[]> {
    return await this.prisma.reports.findMany({
      where: { user_id: userId, bike_id: bikeId },
      orderBy: { created_at: 'desc' },
    });
  }

  async revoke(id: number, userId: number): Promise<void> {
    await this.prisma.reports.updateMany({
      where: { id, user_id: userId },
      data: { revoked: true },
    });
  }

  // Public access by token: validates state and counts the view.
  async getPublicSnapshot(token: string): Promise<ReportSnapshot> {
    const report = await this.prisma.reports.findUnique({ where: { public_token: token } });
    if (!report || report.revoked || (report.expires_at && report.expires_at < new Date())) {
      throw new GoneException('This report is no longer available');
    }

    await this.prisma.reports.update({
      where: { id: report.id },
      data: { view_count: { increment: 1 }, last_viewed_at: new Date() },
    });

    return report.snapshot as unknown as ReportSnapshot;
  }

  private buildSnapshot(bike: ReportBikeWithRelations): ReportSnapshot {
    const components: ReportComponent[] = bike.components_mounted.map((c) => ({
      type: c.component_types.component_type,
      description: c.component_desc,
      position: c.position,
      totalKm: c.total_km ?? 0,
      totalTimeMin: c.total_time_min ?? 0,
      healthIndex: c.health_index ?? 0,
      mountedAt: c.mounted_at?.toISOString() ?? null,
    }));

    const serviceHistory: ReportServiceEvent[] = bike.events_bikes.map((event) => ({
      date: event.created_at?.toISOString() ?? null,
      note: event.note,
      actions: event.event_actions_done.map((done) => done.events_action.action_name),
    }));

    return {
      version: REPORT_SNAPSHOT_VERSION,
      generatedAt: new Date().toISOString(),
      bike: {
        name: bike.bikename,
        brand: bike.bike_brand,
        model: bike.bike_model,
        year: bike.year,
        frameMaterial: bike.frame_material,
        type: bike.bike_types?.type ?? null,
        ebike: bike.ebike,
        totalKm: bike.total_km,
        totalTimeMin: bike.total_time_min,
        imageUrl: bike.image_url,
      },
      components,
      serviceHistory,
    };
  }
}
