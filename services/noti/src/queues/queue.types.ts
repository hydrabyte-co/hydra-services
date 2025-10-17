/**
 * Queue Event Types
 * Định nghĩa 4 loại event cho notification queue
 */

/**
 * system.notification event
 * For system-wide announcements and notifications
 */
export interface SystemNotificationQueueEvent {
  event: 'system.notification';
  data: {
    title: string;
    message: string;
    severity: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      broadcast?: boolean;
    };
  };
}

/**
 * service.event event
 * For general service events
 */
export interface ServiceEventQueueEvent {
  event: 'service.event';
  data: {
    name: string;
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      agentId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      agentIds?: string[];
      broadcast?: boolean;
    };
  };
}

/**
 * service.alert event
 * For service alerts and warnings
 */
export interface ServiceAlertQueueEvent {
  event: 'service.alert';
  data: {
    title: string;
    message: string;
    severity: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      broadcast?: boolean;
    };
  };
}

/**
 * agent.event event
 * For agent-specific events and actions
 */
export interface AgentEventQueueEvent {
  event: 'agent.event';
  data: {
    name: string;
    title?: string;
    message?: string;
    severity?: 'low' | 'normal' | 'high' | 'critical';
    metadata: {
      correlationId?: string;
      orgId?: string;
      userId?: string;
      agentId?: string;
      timestamp: string;
    };
    data?: Record<string, any>;
    recipients: {
      userIds?: string[];
      orgIds?: string[];
      agentIds?: string[];
      broadcast?: boolean;
    };
  };
}

/**
 * Union type for all queue events
 */
export type NotificationQueueEvent =
  | SystemNotificationQueueEvent
  | ServiceEventQueueEvent
  | ServiceAlertQueueEvent
  | AgentEventQueueEvent;
