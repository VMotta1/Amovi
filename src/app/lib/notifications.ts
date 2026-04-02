import { supabase } from "../../lib/supabase";
import type { AppNotification, AppNotificationInput } from "../types/notifications";

interface NotificationRow {
  id: string;
  user_id: string;
  source_key: string;
  type: "info" | "warning" | "success" | "alert";
  title: string;
  message: string;
  payload: Record<string, string | number | boolean | null> | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

const notificationSelect = `
  id,
  user_id,
  source_key,
  type,
  title,
  message,
  payload,
  read_at,
  dismissed_at,
  created_at,
  updated_at
`;

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    sourceKey: row.source_key,
    type: row.type,
    title: row.title,
    message: row.message,
    payload: row.payload ?? {},
    readAt: row.read_at,
    dismissedAt: row.dismissed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select(notificationSelect)
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapNotification(row as NotificationRow));
}

export async function syncNotifications(userId: string, inputs: AppNotificationInput[]) {
  if (inputs.length === 0) {
    return listNotifications(userId);
  }

  const sourceKeys = inputs.map((item) => item.sourceKey);
  const { data: existingData, error: existingError } = await supabase
    .from("notifications")
    .select(notificationSelect)
    .eq("user_id", userId)
    .in("source_key", sourceKeys);

  if (existingError) throw existingError;

  const existingByKey = new Map(
    (existingData ?? []).map((row) => {
      const typed = row as NotificationRow;
      return [typed.source_key, typed];
    }),
  );

  const inserts = inputs.filter((item) => !existingByKey.has(item.sourceKey));
  const updates = inputs.filter((item) => existingByKey.has(item.sourceKey));

  if (inserts.length > 0) {
    const { error } = await supabase.from("notifications").insert(
      inserts.map((item) => ({
        user_id: userId,
        source_key: item.sourceKey,
        type: item.type,
        title: item.title,
        message: item.message,
        payload: item.payload ?? {},
        created_at: item.createdAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    );

    if (error) throw error;
  }

  await Promise.all(
    updates.map(async (item) => {
      const existing = existingByKey.get(item.sourceKey);
      if (!existing) return;

      const hasChanged =
        existing.title !== item.title ||
        existing.message !== item.message ||
        existing.type !== item.type ||
        JSON.stringify(existing.payload ?? {}) !== JSON.stringify(item.payload ?? {});

      if (!hasChanged) return;

      const { error } = await supabase
        .from("notifications")
        .update({
          type: item.type,
          title: item.title,
          message: item.message,
          payload: item.payload ?? {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", userId);

      if (error) throw error;
    }),
  );

  return listNotifications(userId);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .is("read_at", null);

  if (error) throw error;
}

export async function dismissNotification(userId: string, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}
