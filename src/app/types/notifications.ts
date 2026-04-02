export type NotificationSeverity = "info" | "warning" | "success" | "alert";

export interface AppNotification {
  id: string;
  userId: string;
  sourceKey: string;
  type: NotificationSeverity;
  title: string;
  message: string;
  payload: Record<string, string | number | boolean | null>;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotificationInput {
  sourceKey: string;
  type: NotificationSeverity;
  title: string;
  message: string;
  payload?: Record<string, string | number | boolean | null>;
  createdAt?: string;
}
