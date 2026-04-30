import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service';
import { ComponentRepository } from './component.repository';
import {
  Response_ComponentGroupDto,
  AssembleBikeComponentsDto,
  Response_MountedComponentsDto,
  Response_ComponentDto,
} from './dto/response-components';
import { CustomComponentsDto } from './dto/create-components';

@Injectable()
export class ComponentService {
  constructor(private readonly componentRepository: ComponentRepository) {}

  async createComponentType(dto: CustomComponentsDto): Promise<Response_ComponentDto> {
    return await this.componentRepository.createComponentType(dto);
  }
  async getComponentsDefaults(ebike: boolean): Promise<AssembleBikeComponentsDto[]> {
    return await this.componentRepository.getDefaultComponents(ebike);
  }

  async getMountedComponents(bikeId: string): Promise<Response_MountedComponentsDto[]> {
    return await this.componentRepository.findMountedComponentsByBikeId(+bikeId);
  }

  async getAllComponentGroups(): Promise<Response_ComponentGroupDto[]> {
    return await this.componentRepository.getAllComponentGroups();
  }
}

// const prisma = new PrismaService();
// const componentRepository = new ComponentRepository(prisma);
// const componentService = new ComponentService(componentRepository);
// componentService
//   .getAllComponentGroups() // Replace '1' with the actual bike ID
//   .then((options) => {
//     console.log(options);
//   })
//   .catch((error) => {
//     console.error('Error fetching component form options:', error);
//   });
