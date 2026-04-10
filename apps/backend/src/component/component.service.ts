import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssembleBikeComponents } from '../bike/bike-data-scraper/bike-data-scraper.types';

@Injectable()
export class ComponentService {
  constructor(private readonly prisma: PrismaService) {}

  async getComponentsFormOptions(): Promise<AssembleBikeComponents[]> {
    const componenetsTypes = await this.prisma.component_types.findMany({});
    const mountedComponentFormOptions = componenetsTypes.map((comp) => {
      return {
        component: {
          bike_id: 0, // Placeholder, should be set to the actual bike ID
          component_type_id: comp.id,
          component_desc: undefined,
          mounted_at: undefined,
          total_mileage_km: 0,
          is_active: false,
          note: '',
          interval_id: undefined,
          brake_load_since_service: undefined,
          last_serviced_at: undefined,
          custom_component_type: '',
        },
        component_name: comp.component_type!,
      };
    });
    return mountedComponentFormOptions;
  }
}

// const prisma = new PrismaService();
// const componentService = new ComponentService(prisma);
// componentService
//   .getComponentsFormOptions()
//   .then((options) => {
//     console.log(options);
//   })
//   .catch((error) => {
//     console.error('Error fetching component form options:', error);
//   });
