export interface CommonResponse {
  success: boolean;
  message: string;
  error?: Error;
  data?: unknown;
  meta?: Record<string, unknown>;
}
