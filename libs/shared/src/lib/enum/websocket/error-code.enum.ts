/**
 * WebSocket protocol error codes
 */

// Authentication Errors (1xxx)
export enum AuthErrorCode {
  TOKEN_MISSING = '1001',
  TOKEN_INVALID = '1002',
  TOKEN_EXPIRED = '1003',
  NODE_NOT_FOUND = '1004',
  NODE_INACTIVE = '1005',
  ROLE_MISSING = '1006',
  NODE_ALREADY_CONNECTED = '1007',
}

// Command Errors (2xxx)
export enum CommandErrorCode {
  COMMAND_INVALID = '2001',
  DEPLOYMENT_NOT_FOUND = '2002',
  MODEL_NOT_FOUND = '2003',
  GPU_NOT_AVAILABLE = '2004',
  INSUFFICIENT_MEMORY = '2005',
  CONTAINER_START_FAILED = '2006',
  DEPLOYMENT_ALREADY_RUNNING = '2007',
  DEPLOYMENT_NOT_RUNNING = '2008',
}

// System Errors (3xxx)
export enum SystemErrorCode {
  INTERNAL_ERROR = '3001',
  TIMEOUT = '3002',
  RESOURCE_EXHAUSTED = '3003',
  NETWORK_ERROR = '3004',
}

// All error codes combined
export type ErrorCode = AuthErrorCode | CommandErrorCode | SystemErrorCode;

/**
 * Error code metadata
 */
export interface ErrorCodeInfo {
  code: string;
  message: string;
  retryable: boolean;
  httpEquivalent?: number;
}

export const ERROR_CODE_METADATA: Record<string, ErrorCodeInfo> = {
  // Authentication Errors
  [AuthErrorCode.TOKEN_MISSING]: {
    code: AuthErrorCode.TOKEN_MISSING,
    message: 'No authentication token provided',
    retryable: false,
    httpEquivalent: 401,
  },
  [AuthErrorCode.TOKEN_INVALID]: {
    code: AuthErrorCode.TOKEN_INVALID,
    message: 'Invalid JWT token format',
    retryable: false,
    httpEquivalent: 401,
  },
  [AuthErrorCode.TOKEN_EXPIRED]: {
    code: AuthErrorCode.TOKEN_EXPIRED,
    message: 'JWT token has expired',
    retryable: true,
    httpEquivalent: 401,
  },
  [AuthErrorCode.NODE_NOT_FOUND]: {
    code: AuthErrorCode.NODE_NOT_FOUND,
    message: 'Node ID not found in database',
    retryable: false,
    httpEquivalent: 404,
  },
  [AuthErrorCode.NODE_INACTIVE]: {
    code: AuthErrorCode.NODE_INACTIVE,
    message: 'Node status is not active',
    retryable: false,
    httpEquivalent: 403,
  },
  [AuthErrorCode.ROLE_MISSING]: {
    code: AuthErrorCode.ROLE_MISSING,
    message: 'Missing required node role',
    retryable: false,
    httpEquivalent: 403,
  },
  [AuthErrorCode.NODE_ALREADY_CONNECTED]: {
    code: AuthErrorCode.NODE_ALREADY_CONNECTED,
    message: 'Node already has active connection',
    retryable: false,
    httpEquivalent: 409,
  },

  // Command Errors
  [CommandErrorCode.COMMAND_INVALID]: {
    code: CommandErrorCode.COMMAND_INVALID,
    message: 'Invalid command format or parameters',
    retryable: false,
  },
  [CommandErrorCode.DEPLOYMENT_NOT_FOUND]: {
    code: CommandErrorCode.DEPLOYMENT_NOT_FOUND,
    message: 'Deployment not found',
    retryable: false,
  },
  [CommandErrorCode.MODEL_NOT_FOUND]: {
    code: CommandErrorCode.MODEL_NOT_FOUND,
    message: 'Model not found',
    retryable: false,
  },
  [CommandErrorCode.GPU_NOT_AVAILABLE]: {
    code: CommandErrorCode.GPU_NOT_AVAILABLE,
    message: 'GPU device not available',
    retryable: true,
  },
  [CommandErrorCode.INSUFFICIENT_MEMORY]: {
    code: CommandErrorCode.INSUFFICIENT_MEMORY,
    message: 'Insufficient memory available',
    retryable: true,
  },
  [CommandErrorCode.CONTAINER_START_FAILED]: {
    code: CommandErrorCode.CONTAINER_START_FAILED,
    message: 'Failed to start container',
    retryable: true,
  },
  [CommandErrorCode.DEPLOYMENT_ALREADY_RUNNING]: {
    code: CommandErrorCode.DEPLOYMENT_ALREADY_RUNNING,
    message: 'Deployment is already running',
    retryable: false,
  },
  [CommandErrorCode.DEPLOYMENT_NOT_RUNNING]: {
    code: CommandErrorCode.DEPLOYMENT_NOT_RUNNING,
    message: 'Deployment is not running',
    retryable: false,
  },

  // System Errors
  [SystemErrorCode.INTERNAL_ERROR]: {
    code: SystemErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
    retryable: true,
    httpEquivalent: 500,
  },
  [SystemErrorCode.TIMEOUT]: {
    code: SystemErrorCode.TIMEOUT,
    message: 'Operation timed out',
    retryable: true,
    httpEquivalent: 504,
  },
  [SystemErrorCode.RESOURCE_EXHAUSTED]: {
    code: SystemErrorCode.RESOURCE_EXHAUSTED,
    message: 'System resources exhausted',
    retryable: true,
    httpEquivalent: 503,
  },
  [SystemErrorCode.NETWORK_ERROR]: {
    code: SystemErrorCode.NETWORK_ERROR,
    message: 'Network communication error',
    retryable: true,
  },
};
