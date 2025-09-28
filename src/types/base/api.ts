export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string | undefined;
  errors?: string[] | undefined;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  } | undefined;
}


export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}