export interface BikeSearchQuery {
  brand: string;
  model: string;
  year: string;
}

export interface BikeListItem {
  name: string;
  image: string | null;
  url: string;
}

export interface BikeComponentsType {
  component: string;
  desc: string;
}
