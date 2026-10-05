import { useMemo, useCallback } from "react";

import type { Notification } from "@/types/inventory";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useNotifications(): QueryResult<Notification[]> {
  return useMemo(() => {
    return { data: [] as Notification[], isLoading: false, error: null };
  }, []);
}

export function useUnreadCount(): number {
  return 0;
}

export function useMarkAsRead() {
  return useCallback((id: string) => {}, []);
}

export function useMarkAllAsRead() {
  return useCallback(() => {}, []);
}

export function useDismissNotification() {
  return useCallback((id: string) => {}, []);
}
