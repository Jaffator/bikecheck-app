import { PartialType } from '@nestjs/mapped-types';
import { CreateComponentsDto } from './create-components';

export class UpdateComponentsDto extends PartialType(CreateComponentsDto) {}
