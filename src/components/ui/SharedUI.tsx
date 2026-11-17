"use client";

import React from "react";

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  scope: string;
  permissions: string[];
  phone: string | null;
  designation: string;
  institutionId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  institution: {
    id: string;
    name: string;
    code: string;
    district: string;
    city: string;
    principalName: string;
    university: { name: string; code: string };
  } | null;
}

export function can(user: CurrentUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function canAny(user: CurrentUser, permissions: string[]): boolean {
  return permissions.some((p) => user.permissions.includes(p));
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#0F3D2E]/25 rounded-lg p-4 flex items-start justify-between hover:border-[#0F3D2E] transition">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D2E]/70">
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-bold text-[#0F3D2E] tracking-tight">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-[#0F3D2E]/75">{subtext}</p>
        )}
      </div>
      <div className="p-2.5 rounded-md bg-[#0F3D2E] text-white shrink-0">
        {icon}
      </div>
    </div>
  );
}

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return active ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#0F3D2E] text-white">
      {activeLabel}
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border border-[#0F3D2E] text-[#0F3D2E] bg-white">
      {inactiveLabel}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#0F3D2E]/20">
      <div>
        <h2 className="text-xl font-bold text-[#0F3D2E] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#0F3D2E]/75 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function NoticeBanner({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded border-2 border-[#0F3D2E] bg-[#0F3D2E]/5 text-xs font-semibold text-[#0F3D2E] flex items-center justify-between gap-3">
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="px-2 py-0.5 border border-[#0F3D2E] rounded text-[11px] hover:bg-[#0F3D2E] hover:text-white transition cursor-pointer"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
