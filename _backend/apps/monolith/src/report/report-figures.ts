import type { ReportAction, ReportBike, ReportComponent, ReportService, ReportSnapshot } from './report.types';

// Km and time come from Strava rides. A reader behind the Share Link gets them only when the
// owner agreed at publishing (#380); the stored document is never touched, only what leaves.
export function withoutFigures(document: ReportSnapshot): ReportSnapshot {
  switch (document.kind) {
    case 'SERVICE':
      return { ...document, bike: bikeWithout(document.bike), service: serviceWithout(document.service) };
    case 'BIKE':
      return {
        ...document,
        bike: bikeWithout(document.bike),
        components: document.components?.map(componentWithout) ?? null,
        history: document.history && {
          ...document.history,
          services: document.history.services.map(serviceWithout),
        },
      };
    case 'PERIOD':
      return {
        ...document,
        bike: bikeWithout(document.bike),
        services: document.services.map(serviceWithout),
        components: document.components?.map(componentWithout) ?? null,
      };
    case 'BIKECHECK':
      return { ...document, bike: bikeWithout(document.bike), components: document.components.map(componentWithout) };
  }
}

function bikeWithout(bike: ReportBike): ReportBike {
  return { ...bike, totalKm: null, totalTimeMin: null };
}

function componentWithout(component: ReportComponent): ReportComponent {
  return { ...component, totalKm: null, totalTimeMin: null };
}

function actionWithout(action: ReportAction): ReportAction {
  return { ...action, components: action.components.map(componentWithout) };
}

function serviceWithout(service: ReportService): ReportService {
  return { ...service, odometerKm: null, odometerTimeMin: null, actions: service.actions.map(actionWithout) };
}
