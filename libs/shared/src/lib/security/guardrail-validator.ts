/**
 * Guardrail Validator Utility
 * Validates user messages against agent guardrails configuration
 */

export interface GuardrailConfig {
  enabled: boolean;
  blockedKeywords?: string[];
  blockedTopics?: string[];
  customMessage?: string;
}

export interface GuardrailValidationResult {
  allowed: boolean;
  reason?: string;
  violationType?: 'keyword' | 'topic';
  violationValue?: string;
}

/**
 * Guardrail Validator Class
 * Provides methods to validate messages against guardrail rules
 */
export class GuardrailValidator {
  /**
   * Validate a message against guardrail configuration
   * @param message - User message to validate
   * @param config - Guardrail configuration
   * @returns Validation result with allowed status and reason if blocked
   */
  static validate(message: string, config?: GuardrailConfig): GuardrailValidationResult {
    // If guardrails not configured or disabled, allow all messages
    if (!config || !config.enabled) {
      return { allowed: true };
    }

    const lowerMessage = message.toLowerCase();

    // Check blocked keywords
    if (config.blockedKeywords && config.blockedKeywords.length > 0) {
      for (const keyword of config.blockedKeywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return {
            allowed: false,
            reason: config.customMessage || `Content blocked: contains restricted keyword "${keyword}"`,
            violationType: 'keyword',
            violationValue: keyword,
          };
        }
      }
    }

    // Check blocked topics
    if (config.blockedTopics && config.blockedTopics.length > 0) {
      for (const topic of config.blockedTopics) {
        if (lowerMessage.includes(topic.toLowerCase())) {
          return {
            allowed: false,
            reason: config.customMessage || `Content blocked: topic "${topic}" is restricted`,
            violationType: 'topic',
            violationValue: topic,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Batch validate multiple messages
   * @param messages - Array of messages to validate
   * @param config - Guardrail configuration
   * @returns Array of validation results
   */
  static validateBatch(
    messages: string[],
    config?: GuardrailConfig
  ): GuardrailValidationResult[] {
    return messages.map((message) => this.validate(message, config));
  }

  /**
   * Check if a message is allowed (simplified version)
   * @param message - User message to check
   * @param config - Guardrail configuration
   * @returns True if message is allowed, false otherwise
   */
  static isAllowed(message: string, config?: GuardrailConfig): boolean {
    return this.validate(message, config).allowed;
  }

  /**
   * Get violation details from a message
   * @param message - User message to check
   * @param config - Guardrail configuration
   * @returns Object with violation details or null if allowed
   */
  static getViolation(
    message: string,
    config?: GuardrailConfig
  ): { type: string; value: string } | null {
    const result = this.validate(message, config);
    if (result.allowed || !result.violationType || !result.violationValue) {
      return null;
    }

    return {
      type: result.violationType,
      value: result.violationValue,
    };
  }
}

/**
 * Default guardrail messages
 */
export const DEFAULT_GUARDRAIL_MESSAGES = {
  KEYWORD_BLOCKED: 'I cannot assist with that request due to content restrictions.',
  TOPIC_BLOCKED: 'I cannot provide assistance on this topic.',
  GENERAL_BLOCKED: 'I cannot process this request.',
};
