"use client";

import { useState, useEffect } from "react";
import { trpc } from "@web/lib/trpc-client";
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@web/lib/utils";

export default function ProfilePage() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name || !formData.email) {
      setError("Name and Email are required.");
      return;
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        newPassword: formData.newPassword || "",
      });
      setSuccess(true);
      setFormData((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E28743]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#EADED2]">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-[#8E7E72]">
          Manage your personal account settings and password.
        </p>
      </div>

      <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Error & Success States */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg bg-red-500/10 p-4 text-red-500 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 rounded-lg bg-[#10B981]/10 p-4 text-[#10B981] border border-[#10B981]/20 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Profile updated successfully!</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#EADED2] border-b border-[#2C2724] pb-2">
              Personal Information
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E7E72]">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-4 w-4 text-[#8E7E72]" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#2C2724] bg-[#1C1816] py-2.5 pl-10 pr-4 text-sm text-[#EADED2] placeholder-[#8E7E72] outline-none transition-colors focus:border-[#E28743] focus:bg-[#1E1A18] focus:ring-1 focus:ring-[#E28743]/50"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E7E72]">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-[#8E7E72]" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#2C2724] bg-[#1C1816] py-2.5 pl-10 pr-4 text-sm text-[#EADED2] placeholder-[#8E7E72] outline-none transition-colors focus:border-[#E28743] focus:bg-[#1E1A18] focus:ring-1 focus:ring-[#E28743]/50"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#EADED2] border-b border-[#2C2724] pb-2">
              Change Password
            </h3>
            <p className="text-xs text-[#8E7E72]">
              Leave these fields blank if you do not wish to change your password.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E7E72]">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-[#8E7E72]" />
                  </div>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#2C2724] bg-[#1C1816] py-2.5 pl-10 pr-4 text-sm text-[#EADED2] placeholder-[#8E7E72] outline-none transition-colors focus:border-[#E28743] focus:bg-[#1E1A18] focus:ring-1 focus:ring-[#E28743]/50"
                    placeholder="New password"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E7E72]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-[#8E7E72]" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#2C2724] bg-[#1C1816] py-2.5 pl-10 pr-4 text-sm text-[#EADED2] placeholder-[#8E7E72] outline-none transition-colors focus:border-[#E28743] focus:bg-[#1E1A18] focus:ring-1 focus:ring-[#E28743]/50"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl bg-[#E28743] px-6 py-2.5 text-sm font-bold text-[#161312] transition-colors hover:bg-[#F49753] active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              )}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
