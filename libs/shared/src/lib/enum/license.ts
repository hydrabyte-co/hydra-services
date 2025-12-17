/**
 * License types for organization service access
 *
 * Defines the access level an organization has for each service.
 * License enforcement is performed by LicenseGuard using @RequireLicense decorator.
 *
 * @enum {string}
 */
export enum LicenseType {
  /**
   * DISABLED: Organization cannot access the service at all
   * All endpoints with @RequireLicense decorator will be blocked
   */
  DISABLED = 'disabled',

  /**
   * LIMITED: Organization has restricted access to the service
   * Can access endpoints marked with @RequireLicense(LicenseType.LIMITED)
   * Cannot access endpoints requiring FULL license
   * Typically used for read-only or basic features
   */
  LIMITED = 'limited',

  /**
   * FULL: Organization has complete access to all service features
   * Can access all endpoints regardless of @RequireLicense requirement
   * No restrictions or quotas enforced
   */
  FULL = 'full',
}
