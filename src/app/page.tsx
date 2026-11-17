"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrandEmblem } from "@/components/BrandEmblem";
import { LoginView } from "@/components/LoginView";
import { ForcePasswordModal } from "@/components/ForcePasswordModal";
import { SuperAdminWorkspace } from "@/components/SuperAdminWorkspace";
import { CollegeAdminWorkspace } from "@/components/CollegeAdminWorkspace";
import { CurrentUser } from "@/components/ui/SharedUI";

export default function HomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(
          data.user
            ? { ...data.user, permissions: data.permissions || [] }
            : null
        );
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-[#0F3D2E]">
        <BrandEmblem variant="dark" size={56} />
        <p className="text-xs font-bold uppercase tracking-widest">
          Initializing AP Skill Development LMS...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={fetchSession} />;
  }

  if (user.mustChangePassword) {
    return (
      <ForcePasswordModal
        userEmail={user.email}
        onSuccess={fetchSession}
        onLogout={handleLogout}
      />
    );
  }

  if (user.scope === "STATEWIDE" || user.scope === "DISTRICT") {
    return (
      <SuperAdminWorkspace
        user={user}
        onLogout={handleLogout}
        onRefreshUser={fetchSession}
      />
    );
  }

  return (
    <CollegeAdminWorkspace
      user={user}
      onLogout={handleLogout}
      onRefreshUser={fetchSession}
    />
  );
}
