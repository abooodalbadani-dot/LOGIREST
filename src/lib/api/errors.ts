export class ApiError extends Error {
  public code: string;
  public status: number;
  public field_errors?: Record<string, string[]>;

  constructor(message: string, code: string, status: number, field_errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.field_errors = field_errors;
  }
}
