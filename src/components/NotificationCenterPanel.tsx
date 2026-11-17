"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { SectionHeader } from "./ui/SharedUI";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  institution?: { code: string; name: string } | null;
}

export function NotificationCenterPanel({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      onUnreadChange?.(data.unreadCount || 0);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { markAllRead: true }),
    });
    loadNotifications();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notifications"
        subtitle={`You have ${unreadCount} unread update(s) and reminders`}
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markRead()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#0F3D2E] text-white text-xs font-bold rounded cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="px-2.5 py-1 rounded bg-[#0F3D2E] text-white">In-App: Active</span>
        <span className="px-2.5 py-1 rounded border border-[#0F3D2E]/40">Email: Ready</span>
        <span className="px-2.5 py-1 rounded border border-[#0F3D2E]/40">SMS: Ready</span>
        <span className="px-2.5 py-1 rounded border border-[#0F3D2E]/40">WhatsApp: Ready</span>
      </div>

      <div className="border border-[#0F3D2E]/25 rounded-lg divide-y divide-[#0F3D2E]/15">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex items-start justify-between gap-4 ${
              n.isRead ? "bg-white" : "bg-[#0F3D2E]/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-[#0F3D2E] text-white mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{n.title}</p>
                  {!n.isRead && (
                    <span className="px-1.5 py-0.5 rounded bg-[#0F3D2E] text-white text-[10px] font-bold">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#0F3D2E]/85 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-[#0F3D2E]/65 mt-1">
                  {n.institution ? `${n.institution.code} • ` : "Statewide • "}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {!n.isRead && (
              <button
                onClick={() => markRead(n.id)}
                className="px-2.5 py-1 border border-[#0F3D2E] rounded text-[11px] font-semibold hover:bg-[#0F3D2E] hover:text-white cursor-pointer shrink-0"
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="p-6 text-center text-xs text-[#0F3D2E]/60">
            No notifications available.
          </p>
        )}
      </div>
    </div>
  );
}
