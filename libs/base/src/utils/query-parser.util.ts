import * as qs from 'qs';

/**
 * Custom query parser that extends qs functionality
 * Supports dot notation in bracket syntax: filter[metadata.discordUserId]=123
 * Will keep dot notation as-is for MongoDB queries: { filter: { 'metadata.discordUserId': 123 } }
 */
export function customQueryParser(str: string): any {
  // Parse with qs - DON'T use allowDots to preserve dot notation in keys
  const parsed = qs.parse(str, {
    depth: 10,
    arrayLimit: 100,
    parseArrays: true,
    allowDots: false, // Keep dots as literal characters in keys
  });

  return parsed;
}
