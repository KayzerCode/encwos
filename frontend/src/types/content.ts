// types/content.ts

export interface SeedGroup {
  id: number;
  name: string;
  slug: string;
  description: string;
  seeds_count: number;
  created_at: string;
  updated_at: string;
}

export interface SEOData {
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
}

export interface ContentSeed {
  id: number;
  seed_phrase: string;
  slug: string;
  seed_group_id: number;
  active: boolean;
  seo_data: SEOData;
  products_found: number;
  last_scraped: string | null;
  created_at: string;
  updated_at: string;
  group_name?: string;
}

export interface CreateSeedRequest {
  seed_phrase: string;
  seed_group_id: number;
  seo_data?: SEOData;
}

export interface UpdateSeedRequest {
  seed_phrase?: string;
  seed_group_id?: number;
  active?: boolean;
  seo_data?: SEOData;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface SeedsFilters {
  active?: boolean;
  group_id?: number;
}

export interface APIResponse<T> {
  data: T;
  status: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  module: string;
  seeds_count: number;
  groups_count: number;
}