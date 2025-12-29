/**
 * Colored Logger Utility for Hydra Services
 *
 * Usage:
 *   import { logInfo, logDebug, logError, logWarn } from '@hydra/shared/utils';
 *
 *   logInfo('User created', { userId: '123', username: 'john' });
 *   logDebug('Query executed', { query: 'SELECT * FROM users' });
 *   logError('Database connection failed', { error: err.message });
 */

// ANSI color codes
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',

  // Foreground colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',

  // Background colors
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
};

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogOptions {
  context?: string;
  timestamp?: boolean;
}

/**
 * Format timestamp in readable format
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format data object for display
 */
function formatData(data?: any): string {
  if (data === undefined || data === null) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return String(data);
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  data?: any,
  options: LogOptions = {}
): void {
  const { context, timestamp = true } = options;

  // Skip debug logs in production
  if (level === LogLevel.DEBUG && process.env['NODE_ENV'] === 'production') {
    return;
  }

  let color = COLORS.RESET;
  let levelColor = COLORS.WHITE;

  // Set colors based on log level
  switch (level) {
    case LogLevel.INFO:
      color = COLORS.CYAN;
      levelColor = COLORS.CYAN;
      break;
    case LogLevel.DEBUG:
      color = COLORS.YELLOW;
      levelColor = COLORS.YELLOW;
      break;
    case LogLevel.WARN:
      color = COLORS.MAGENTA;
      levelColor = COLORS.MAGENTA;
      break;
    case LogLevel.ERROR:
      color = COLORS.RED;
      levelColor = COLORS.RED;
      break;
  }

  // Build log prefix
  let logPrefix = '';

  if (timestamp) {
    logPrefix += `${COLORS.GRAY}[${getTimestamp()}]${COLORS.RESET} `;
  }

  logPrefix += `${levelColor}[${level}]${COLORS.RESET}`;

  if (context) {
    logPrefix += ` ${COLORS.GREEN}[${context}]${COLORS.RESET}`;
  }

  // Colored message
  const coloredMessage = `${color}${message}${COLORS.RESET}`;

  // Output
  console.log(`${logPrefix} ${coloredMessage}`);

  // Print data if provided (in default color)
  if (data !== undefined && data !== null) {
    const formattedData = formatData(data);
    if (formattedData) {
      console.log(`${COLORS.RESET}${formattedData}${COLORS.RESET}`);
    }
  }
}

/**
 * Log INFO level message
 * Color: Cyan
 * Use for: General information, successful operations
 */
export function logInfo(message: string, data?: any, context?: string): void {
  log(LogLevel.INFO, message, data, { context });
}

/**
 * Log DEBUG level message
 * Color: Yellow
 * Use for: Debugging information, detailed flow
 * Note: Automatically hidden in production
 */
export function logDebug(message: string, data?: any, context?: string): void {
  log(LogLevel.DEBUG, message, data, { context });
}

/**
 * Log WARN level message
 * Color: Magenta
 * Use for: Warning conditions, deprecated usage
 */
export function logWarn(message: string, data?: any, context?: string): void {
  log(LogLevel.WARN, message, data, { context });
}

/**
 * Log ERROR level message
 * Color: Red
 * Use for: Error conditions, exceptions
 */
export function logError(message: string, data?: any, context?: string): void {
  log(LogLevel.ERROR, message, data, { context });
}

/**
 * Create a logger instance with predefined context
 *
 * Usage:
 *   const logger = createLogger('CategoryService');
 *   logger.info('Category created', { id: '123' });
 *   logger.log('Category created', { id: '123' }); // Alias for info (NestJS compatibility)
 */
export function createLogger(context: string) {
  return {
    log: (message: string, data?: any) => logInfo(message, data, context), // Alias for NestJS Logger compatibility
    info: (message: string, data?: any) => logInfo(message, data, context),
    debug: (message: string, data?: any) => logDebug(message, data, context),
    warn: (message: string, data?: any) => logWarn(message, data, context),
    error: (message: string, data?: any) => logError(message, data, context),
  };
}

/**
 * Log a separator line (useful for grouping logs)
 */
export function logSeparator(char = '─', length = 80): void {
  console.log(`${COLORS.GRAY}${char.repeat(length)}${COLORS.RESET}`);
}

/**
 * Log a section header
 */
export function logSection(title: string): void {
  logSeparator();
  console.log(`${COLORS.BRIGHT}${COLORS.CYAN}  ${title}${COLORS.RESET}`);
  logSeparator();
}
