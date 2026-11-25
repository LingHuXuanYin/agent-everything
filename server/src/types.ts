export type Category =
  | 'gpu-baremetal'
  | 'gpu-hourly'
  | 'text-api'
  | 'media-api'
  | 'plans';

export type Currency = 'USD' | 'CNY';

export type Availability = 'available' | 'limited' | 'waitlist';

export interface Meta {
  version: string;
  snapshotAt: string;
  rates: { USD: number; CNY: number };
  note: string;
}

export interface Provider {
  id: string;
  name: string;
  short: string;
  region: 'US' | 'CN' | 'EU';
  homepage: string;
}

export interface GpuBaremetalOffer {
  id: string;
  providerId: string;
  product: string;
  gpu: string;
  gpuCount: number;
  vramGb: number;
  price: number;
  currency: Currency;
  region: string;
  minTerm: string;
  availability: Availability;
  sourceUrl: string;
}

export interface GpuHourlyOffer {
  id: string;
  providerId: string;
  gpu: string;
  gpuCount: number;
  vramGb: number;
  price: number;
  prevPrice?: number;
  currency: Currency;
  region: string;
  minTerm: string;
  availability: Availability;
  sourceUrl: string;
}

export interface TextModelOffer {
  id: string;
  providerId: string;
  model: string;
  contextK: number;
  inputPerM: number;
  outputPerM: number;
  cachedInputPerM?: number;
  currency: Currency;
  sourceUrl: string;
}

export interface MediaModelOffer {
  id: string;
  providerId: string;
  model: string;
  kind: 'image' | 'video';
  unit: 'image' | 'second';
  price: number;
  currency: Currency;
  resolution: string;
  sourceUrl: string;
}

export interface PlanOffer {
  id: string;
  providerId: string;
  name: string;
  monthly: number;
  currency: Currency;
  highlights: string[];
  sourceUrl: string;
}

export interface Snapshot {
  meta: Meta;
  providers: Provider[];
  gpuBaremetal: GpuBaremetalOffer[];
  gpuHourly: GpuHourlyOffer[];
  textModels: TextModelOffer[];
  mediaModels: MediaModelOffer[];
  plans: PlanOffer[];
}

export interface Overview {
  snapshotAt: string;
  providers: number;
  records: number;
  categories: number;
  counts: Record<Category, number>;
}
