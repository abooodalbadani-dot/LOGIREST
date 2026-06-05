export class ApiError extends Error {
 public code: string;
 public status: number;
 public fieldErrors?: Record<string, string[]>;

 constructor(message: string, code: string, status: number, fieldErrors?: Record<string, string[]>) {
 super(message);
 this.name = 'ApiError';
 this.code = code;
 this.status = status;
 this.fieldErrors = fieldErrors;
 }
}
