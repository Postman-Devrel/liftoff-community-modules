export interface ValidationContext {
  userId?: string;
  workspaceId?: string;
  environmentId?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  context?: Partial<ValidationContext>;
}

export type ValidatorFn = (
  apiKey: string,
  context: ValidationContext
) => Promise<ValidationResult>;
