/**
 * PII Detector Utility
 * Detects and redacts Personally Identifiable Information (PII) in text
 */

export interface PiiPattern {
  name: string;
  type: string;
  regex: RegExp;
  replacement: string;
}

export interface PiiDetectionResult {
  cleaned: string;
  detected: Array<{
    type: string;
    count: number;
    positions?: Array<{ start: number; end: number }>;
  }>;
  hasPii: boolean;
}

/**
 * PII Detector Class
 * Provides methods to detect and redact PII in text using regex patterns
 */
export class PiiDetector {
  private patterns: PiiPattern[] = [];

  constructor(patterns?: PiiPattern[]) {
    if (patterns) {
      this.patterns = patterns;
    }
  }

  /**
   * Add a pattern to the detector
   */
  addPattern(pattern: PiiPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Load patterns from database records
   */
  loadPatterns(
    records: Array<{
      type: string;
      pattern: string;
      replacement: string;
      enabled: boolean;
      status: string;
    }>
  ): void {
    this.patterns = records
      .filter((r) => r.enabled && r.status === 'active')
      .map((r) => ({
        name: r.type,
        type: r.type,
        regex: new RegExp(r.pattern, 'g'),
        replacement: r.replacement,
      }));
  }

  /**
   * Detect and redact PII in text
   * Returns cleaned text and detection details
   */
  detect(text: string): PiiDetectionResult {
    if (!text || this.patterns.length === 0) {
      return {
        cleaned: text,
        detected: [],
        hasPii: false,
      };
    }

    let cleaned = text;
    const detected: Map<
      string,
      { type: string; count: number; positions: Array<{ start: number; end: number }> }
    > = new Map();

    // Process each pattern
    this.patterns.forEach((pattern) => {
      const matches = text.matchAll(pattern.regex);
      const positions: Array<{ start: number; end: number }> = [];

      for (const match of matches) {
        if (match.index !== undefined) {
          positions.push({
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      }

      if (positions.length > 0) {
        detected.set(pattern.type, {
          type: pattern.type,
          count: positions.length,
          positions,
        });

        // Replace in cleaned text
        cleaned = cleaned.replace(pattern.regex, pattern.replacement);
      }
    });

    return {
      cleaned,
      detected: Array.from(detected.values()),
      hasPii: detected.size > 0,
    };
  }

  /**
   * Simple redact method - returns only cleaned text
   */
  redact(text: string): string {
    return this.detect(text).cleaned;
  }

  /**
   * Check if text contains PII without redacting
   */
  containsPii(text: string): boolean {
    return this.detect(text).hasPii;
  }

  /**
   * Get detection summary
   */
  getSummary(text: string): { hasPii: boolean; types: string[]; totalCount: number } {
    const result = this.detect(text);
    const totalCount = result.detected.reduce((sum, d) => sum + d.count, 0);

    return {
      hasPii: result.hasPii,
      types: result.detected.map((d) => d.type),
      totalCount,
    };
  }
}

/**
 * Default PII patterns (fallback if database is empty)
 */
export const DEFAULT_PII_PATTERNS: PiiPattern[] = [
  {
    name: 'email',
    type: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'phone_vn',
    type: 'phone',
    regex: /(\+84|0)[0-9]{9,10}/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    name: 'credit_card',
    type: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CARD_REDACTED]',
  },
];
