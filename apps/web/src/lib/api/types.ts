export interface PaginatedResponse<T> {
 data: T[];
 meta: {
 total: number;
 page: number;
 pageSize: number;
 totalPages: number;
 };
}

export interface ApiFetchOptions extends RequestInit {
 params?: Record<string, string | number | boolean | undefined>;
}
