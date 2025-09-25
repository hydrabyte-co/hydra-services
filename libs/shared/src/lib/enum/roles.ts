export enum PredefinedScope {
  Universe = 'universe',
  Organization = 'organization',
  Group = 'group',
  Member = 'member',
  Void = 'void',
}

export enum PredefinedRole {
	UniverseOwner = 'universe.owner',
	OrganizationOwner = 'organization.owner',
	OrganizationViewer = 'organization.viewer',
	OrganizationEditor = 'organization.editor',
	GroupOwner = 'group.owner',
	GroupViewer = 'group.viewer',
	GroupEditor = 'group.editor',
	MemberOwner = 'member.owner',
	MemberEditor = 'member.editor',
	MemberViewer = 'member.viewer',
}
