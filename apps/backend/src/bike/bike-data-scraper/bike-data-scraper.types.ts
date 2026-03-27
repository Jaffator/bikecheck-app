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

export interface BikeComponentsType {
  id: number;
  component: string;
  desc: string;
}
