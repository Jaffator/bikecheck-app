import { CreateComponentsDto } from '../../component/dto/create-components';

export interface BikeSearchQuery {
  brand: string;
  model: string;
  year: string | null;
}

export interface BikeListItem {
  name: string;
  image: string | null;
  url: string;
}

export interface BikeComponentsArray {
  component: CreateComponentsDto;
  component_name: string;
}
