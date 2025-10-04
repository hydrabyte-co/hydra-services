export enum PermissionType {
  Read = 'read',
  Write = 'write',
  Delete = 'delete',
  Administrative = 'administrative',
}

export interface PermissionContext {
  allowRead: boolean;
  allowWrite: boolean;
  allowDelete: boolean;
  allowAdministrative: boolean;
  scope: string;
  filter: Record<string, unknown>;
}
