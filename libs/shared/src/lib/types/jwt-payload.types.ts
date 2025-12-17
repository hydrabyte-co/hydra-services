/**
 * JWT Payload Structure
 *
 * This interface defines the structure of data embedded in JWT access tokens.
 * The payload is created during login and refresh token operations.
 *
 * @interface JwtPayload
 */
export interface JwtPayload {
  /** User ID (primary identifier) */
  sub: string;

  /** Username */
  username: string;

  /** User status (active, inactive, pending) */
  status: string;

  /** Array of roles assigned to the user */
  roles: string[];

  /** Organization ID from user's owner field */
  orgId: string;

  /** Group ID from user's owner field */
  groupId: string;

  /** Agent ID from user's owner field */
  agentId: string;

  /** Application ID from user's owner field */
  appId: string;

  /**
   * Organization licenses map
   *
   * Maps service name to license type for the user's organization.
   * Example: { iam: 'full', aiwm: 'limited', cbm: 'disabled' }
   *
   * This field is populated during login/refresh from the License collection.
   * Used by LicenseGuard to enforce service-level access control.
   *
   * @since Phase 1 - License Management
   */
  licenses?: Record<string, string>;
}
