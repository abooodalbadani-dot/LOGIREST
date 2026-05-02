
export interface PaginatedResponse<T> {
 data: T[];
 meta: {
 total: number;
 page: number;
 limit: number;
 totalPages: number;
 };
}

export interface ApiFetchOptions extends RequestInit {
 params?: Record<string, string | number | boolean | undefined>;
}
