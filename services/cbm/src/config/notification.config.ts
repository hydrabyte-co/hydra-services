export interface NotificationConfig {
  discord: {
    enabled: boolean;
    webhookUrl: string;
  };
  // Future: email, notiService
}

export const getNotificationConfig = (): NotificationConfig => {
  return {
    discord: {
      enabled: !!process.env.CBM_DISCORD_WEBHOOK_URL,
      webhookUrl: process.env.CBM_DISCORD_WEBHOOK_URL || '',
    },
  };
};
