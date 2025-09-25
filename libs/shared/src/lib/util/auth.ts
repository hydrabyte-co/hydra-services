import { PredefinedRole, PredefinedScope } from "../enum/roles";

export interface RequestContext {
  orgId: string;
  groupId: string;
  userId: string;
  agentId: string;
  appId: string;
  roles: PredefinedRole[];
}
export interface PermissionContext {
  allowAdministrative: boolean;
  allowFind: boolean;
  allowCreate: boolean;
  allowUpdate: boolean;
  allowHardDelete: boolean;
  allowSoftDelete: boolean;
}

/**
 * Trả về role cao nhất từ danh sách các role
 */
export function getHighestRole(roles: PredefinedRole[]): PredefinedRole | undefined {
  if (!roles || roles.length === 0) return undefined;
  const priority: PredefinedRole[] = [
    PredefinedRole.UniverseOwner,
    PredefinedRole.OrganizationOwner,
    PredefinedRole.OrganizationEditor,
    PredefinedRole.OrganizationViewer,
    PredefinedRole.GroupOwner,
    PredefinedRole.GroupEditor,
    PredefinedRole.GroupViewer,
    PredefinedRole.MemberOwner,
    PredefinedRole.MemberEditor,
    PredefinedRole.MemberViewer,
  ];
  for (const p of priority) {
    if (roles.includes(p)) return p;
  }
  return undefined;
}


export function createRoleBasedPermissions(context: RequestContext): {
  filter: Record<string, unknown>;
  permissions: PermissionContext;
} {
  const role = getHighestRole(context.roles) || '';
  const strs = role.split('.');
  const scope = strs[0] || PredefinedScope.Void;
  const roleName = strs[1] || 'unknown';

  let filter: Record<string, unknown> = {};
  let permissions: PermissionContext = {
    allowAdministrative: false,
    allowFind: false,
    allowCreate: false,
    allowUpdate: false,
    allowHardDelete: false,
    allowSoftDelete: false,
  };

  switch (roleName) {
    case 'owner':
      permissions = {
        allowAdministrative: true,
        allowFind: true,
        allowCreate: true,
        allowUpdate: true,
        allowHardDelete: true,
        allowSoftDelete: true,
      };
      break;
    case 'editor':
      permissions = {
        allowAdministrative: false,
        allowFind: true,
        allowCreate: true,
        allowUpdate: true,
        allowHardDelete: false,
        allowSoftDelete: true,
      };
      break;
    case 'viewer':
      permissions = {
        allowAdministrative: false,
        allowFind: true,
        allowCreate: false,
        allowUpdate: false,
        allowHardDelete: false,
        allowSoftDelete: false,
      };
      break;
    default:
      permissions = {
        allowAdministrative: false,
        allowFind: false,
        allowCreate: false,
        allowUpdate: false,
        allowHardDelete: false,
        allowSoftDelete: false,
      };
      break;
  }

  switch (scope) {
    case PredefinedScope.Universe: {
      filter = {};
      break;
    }
    case PredefinedScope.Organization: {
      filter = { 'owner.orgId': context.orgId };
      break;
    }
    case PredefinedScope.Group: {
      filter = {
        'owner.orgId': context.orgId,
        'owner.groupId': context.groupId,
      };
      break;
    }
    case PredefinedScope.Member: {
      filter = {
        'owner.orgId': context.orgId,
        'owner.groupId': context.groupId,
        $or: [
          { 'owner.userId': context.userId },
          { 'owner.agentId': context.agentId },
        ],
      };
      break;
    }
    case PredefinedScope.Void: {
      filter = { [Math.random()]: new Date().getTime() }; // return empty result
      break;
    }
  }
  console.log('Role-Based Permissions:', {
    role,
    scope,
    roleName,
    filter,
    permissions,
  });
  return {
    filter,
    permissions,
  };
}
