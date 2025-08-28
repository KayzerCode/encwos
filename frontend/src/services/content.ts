// services/content.ts
import type {
  SeedGroup,
  ContentSeed,
  CreateSeedRequest,
  UpdateSeedRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  SeedsFilters,
  HealthCheckResponse
} from '../types/content';

const API_BASE = '/api/content-seeds';

// Base fetch with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Groups API
export async function fetchGroups(): Promise<SeedGroup[]> {
  return apiFetch<SeedGroup[]>('/groups');
}

export async function fetchGroup(id: number): Promise<SeedGroup> {
  return apiFetch<SeedGroup>(`/groups/${id}`);
}

export async function createGroup(data: CreateGroupRequest): Promise<SeedGroup> {
  return apiFetch<SeedGroup>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGroup(id: number, data: UpdateGroupRequest): Promise<SeedGroup> {
  return apiFetch<SeedGroup>(`/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(id: number): Promise<void> {
  await apiFetch<void>(`/groups/${id}`, {
    method: 'DELETE',
  });
}

// Seeds API
export async function fetchSeeds(filters?: SeedsFilters): Promise<ContentSeed[]> {
  const params = new URLSearchParams();

  if (filters?.active !== undefined) {
    params.append('active', filters.active.toString());
  }

  if (filters?.group_id) {
    params.append('group_id', filters.group_id.toString());
  }

  const query = params.toString();
  return apiFetch<ContentSeed[]>(`/seeds${query ? `?${query}` : ''}`);
}

export async function fetchSeed(id: number): Promise<ContentSeed> {
  return apiFetch<ContentSeed>(`/seeds/${id}`);
}

export async function createSeed(data: CreateSeedRequest): Promise<ContentSeed> {
  return apiFetch<ContentSeed>('/seeds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSeed(id: number, data: UpdateSeedRequest): Promise<ContentSeed> {
  return apiFetch<ContentSeed>(`/seeds/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSeed(id: number): Promise<void> {
  await apiFetch<void>(`/seeds/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleSeedActive(id: number): Promise<ContentSeed> {
  return apiFetch<ContentSeed>(`/seeds/${id}/toggle`, {
    method: 'POST',
  });
}

// Health check
export async function healthCheck(): Promise<HealthCheckResponse> {
  return apiFetch<HealthCheckResponse>('/health');
}