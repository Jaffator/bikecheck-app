import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComponentRepository } from './component.repository';
import { ResponseComponentGroupDto, AssembleBikeComponentsDto, ResponseComponentsDto } from './dto/response-components';

@Injectable()
export class ComponentService {
  constructor(private readonly componentRepository: ComponentRepository) {}

  async getComponentsFormOptions(): Promise<AssembleBikeComponentsDto[]> {
    const componentsTypes = await this.componentRepository.getAllComponentTypes();
    const mountedComponentFormOptions = componentsTypes.map((comp) => {
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
        component_name: comp.component_type,
      };
    });
    return mountedComponentFormOptions;
  }

  async getMountedComponents(bikeId: string): Promise<ResponseComponentsDto[]> {
    return await this.componentRepository.getMountedComponents(+bikeId);
  }

  async getAllComponentGroups(): Promise<ResponseComponentGroupDto[]> {
    return await this.componentRepository.getAllComponentGroups();
  }
}

const prisma = new PrismaService();
const componentRepository = new ComponentRepository(prisma);
const componentService = new ComponentService(componentRepository);
componentService
  .getAllComponentGroups() // Replace '1' with the actual bike ID
  .then((options) => {
    console.log(options);
  })
  .catch((error) => {
    console.error('Error fetching component form options:', error);
  });
