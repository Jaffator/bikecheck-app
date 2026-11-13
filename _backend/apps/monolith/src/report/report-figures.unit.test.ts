import { withoutFigures } from './report-figures';
import type { BikeReportSnapshot, ReportBike, ReportComponent, ReportService } from './report.types';

const bike: ReportBike = {
  name: 'Rallon',
  brand: 'Orbea',
  model: 'Rallon M10',
  year: 2024,
  frameMaterial: 'carbon',
  type: 'Enduro',
  ebike: false,
  totalKm: 4187,
  totalTimeMin: 15000,
  imageUrl: null,
};

const component: ReportComponent = {
  type: 'Fork',
  category: 'Suspension',
  description: 'Fox 38',
  position: null,
  totalKm: 1200,
  totalTimeMin: 4800,
  healthIndex: 40,
  mountedAt: null,
  lastServiceAt: null,
};

const service: ReportService = {
  serviceDate: '2026-09-01T00:00:00.000Z',
  note: null,
  totalCost: 0,
  odometerKm: 4800,
  odometerTimeMin: 9000,
  actions: [{ name: 'Fork service', note: null, cost: null, replacement: false, components: [component] }],
  attachments: [],
};

const document: BikeReportSnapshot = {
  kind: 'BIKE',
  generatedAt: '2026-09-20T10:00:00.000Z',
  bike,
  components: [component],
  history: {
    period: { from: null, to: null },
    services: [service],
    totals: { totalCost: 0, serviceCount: 1, replacementCount: 0 },
  },
} as unknown as BikeReportSnapshot;

// Km and time come from Strava rides (#380); what a reader gets without consent has none of them.
describe('withoutFigures', () => {
  it('empties every km and time of a Bike Report, wherever it sits', () => {
    const result = withoutFigures(document) as BikeReportSnapshot;

    expect(result.bike).toMatchObject({ totalKm: null, totalTimeMin: null });
    expect(result.components?.[0]).toMatchObject({ totalKm: null, totalTimeMin: null });
    expect(result.history?.services[0]).toMatchObject({ odometerKm: null, odometerTimeMin: null });
    expect(result.history?.services[0].actions[0].components[0]).toMatchObject({ totalKm: null, totalTimeMin: null });
  });

  it('keeps everything that is not a figure, and leaves the stored document alone', () => {
    const result = withoutFigures(document) as BikeReportSnapshot;

    expect(result.bike.name).toBe('Rallon');
    expect(result.components?.[0].healthIndex).toBe(40);
    expect(document.bike.totalKm).toBe(4187);
  });
});
