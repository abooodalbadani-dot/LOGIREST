export class ConflictError extends Error {
  public currentVersion?: number;
  public updatedBy?: string;
  public updatedAt?: string;
  public code: string;

  constructor(payload: {
    message: string;
    code: string;
    currentVersion?: number;
    updatedBy?: string;
    updatedAt?: string;
  }) {
    super(payload.message);
    this.name = 'ConflictError';
    this.code = payload.code;
    this.currentVersion = payload.currentVersion;
    this.updatedBy = payload.updatedBy;
    this.updatedAt = payload.updatedAt;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
