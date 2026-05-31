/** Shared TypeScript types between frontend and backend */

export interface ApiResponse<T = unknown> {
  status: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}
