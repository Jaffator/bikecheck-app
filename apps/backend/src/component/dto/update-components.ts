import { PartialType } from '@nestjs/mapped-types';
import { CreateMountedComponentsDto } from './create-components';

export class UpdateComponentsDto extends PartialType(CreateMountedComponentsDto) {}
