"use client";

import React, { useState } from "react";
import { Lock, Mail, ArrowRight, BookOpen, Building2, ClipboardCheck } from "lucide-react";
import { BrandEmblem } from "./BrandEmblem";

const DEMO_ACCOUNTS = [
  {
    label: "Super Admin (State Office)",
    email: "superadmin@apssdc.ap.gov.in",
    password: "Admin@AP2026",
    note: "Statewide management",
  },
  {
    label: "College Admin — GVPCE",
    email: "ADM-AP-VSP-001",
    password: "College@2026",
    note: "Visakhapatnam college portal",
  },
  {
    label: "College Admin — VRSEC",
    email: "ADM-AP-NTR-002",
    password: "College@2026",
    note: "Vijayawada college portal",
  },
  {
    label: "College Admin — SVUCE",
    email: "ADM-AP-TPT-003",
    password: "TempPass@2026",
    note: "First-time password setup",
  },
];

export function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Request failed");
      else {
        setNotice(data.message);
        setForgotIdentifier("");
      }
    } catch {
      setError("Network error while submitting request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed. Please check your username and password.");
      } else {
        onLoginSuccess();
      }
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-[#0F3D2E]">
      {/* Left Panel — Deep Forest Green */}
      <div className="lg:w-5/12 bg-[#0F3D2E] text-white p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3.5">
            <BrandEmblem variant="light" size={46} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold">
                Government of Andhra Pradesh
              </p>
              <h1 className="text-xl font-bold tracking-tight">
                AP Skill Development LMS
              </h1>
            </div>
          </div>

          <div className="mt-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase border border-white/40 rounded">
              Official Skill Training Portal
            </span>
            <h2 className="mt-4 text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              Empowering Students Across Andhra Pradesh Colleges
            </h2>
            <p className="mt-4 text-sm text-white/85 leading-relaxed max-w-md">
              A single learning portal connecting colleges, universities,
              trainers, and students across Andhra Pradesh to manage skill
              courses, training batches, daily attendance, and certificates.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded border border-white/20 bg-white/5">
              <Building2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Dedicated College Workspace</p>
                <p className="text-xs text-white/75 mt-0.5">
                  Each college manages its own students, batches, and attendance in a private workspace.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded border border-white/20 bg-white/5">
              <BookOpen className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Industry-Ready Skill Courses</p>
                <p className="text-xs text-white/75 mt-0.5">
                  Track student enrollment, course progress, and trainer guidance across every batch.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded border border-white/20 bg-white/5">
              <ClipboardCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Attendance &amp; Certificate Tracking</p>
                <p className="text-xs text-white/75 mt-0.5">
                  Record daily attendance, monitor completion rates, and download official reports.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/70 border-t border-white/20 pt-4">
          Andhra Pradesh Skill Development Program • Official Learning Management Portal
        </p>
      </div>

      {/* Right Sign-In Panel — Pure White */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="border-b border-[#0F3D2E]/20 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F3D2E]/70">
              Portal Sign In
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F3D2E]">
              {forgotMode ? "Request Password Reset" : "Welcome to AP Skill LMS"}
            </h2>
          </div>

          {error && (
            <div className="mt-5 p-3.5 rounded border-2 border-[#0F3D2E] bg-[#0F3D2E]/5 text-sm font-semibold text-[#0F3D2E]">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-5 p-3.5 rounded border-2 border-[#0F3D2E] bg-[#0F3D2E]/5 text-sm font-semibold text-[#0F3D2E]">
              {notice}
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgotSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Username or Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#0F3D2E]/60" />
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="ADM-AP-VSP-001 or name@apssdc.ap.gov.in"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E] bg-white text-[#0F3D2E]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0F3D2E] text-white text-sm font-semibold rounded hover:bg-[#0A2B20] transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Submitting..." : "Request Password Reset"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError("");
                  setNotice("");
                }}
                className="w-full text-center text-xs font-bold underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Username or Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#0F3D2E]/60" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ADM-AP-VSP-001 or name@apssdc.ap.gov.in"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E] bg-white text-[#0F3D2E]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError("");
                      setNotice("");
                    }}
                    className="text-xs font-bold underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#0F3D2E]/60" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-[#0F3D2E]/40 rounded focus:outline-none focus:border-[#0F3D2E] bg-white text-[#0F3D2E]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0F3D2E] text-white text-sm font-semibold rounded hover:bg-[#0A2B20] transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Signing In..." : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Access */}
          <div className="mt-8 pt-6 border-t border-[#0F3D2E]/20">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D2E]/75 mb-3">
              Quick Demo Sign-In
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setEmail(acc.email);
                    setPassword(acc.password);
                    setError("");
                  }}
                  className="text-left p-2.5 rounded border border-[#0F3D2E]/30 hover:border-[#0F3D2E] hover:bg-[#0F3D2E]/5 transition cursor-pointer"
                >
                  <p className="text-xs font-bold text-[#0F3D2E] truncate">
                    {acc.label}
                  </p>
                  <p className="text-[11px] text-[#0F3D2E]/70 truncate">
                    {acc.note}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
