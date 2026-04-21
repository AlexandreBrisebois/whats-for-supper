export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  recipes: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  updatedAt?: string;
}
