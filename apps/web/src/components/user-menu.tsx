"use client";

import { LogOut } from "lucide-react";
import { useAuth, logout, displayName } from "@/lib/auth/use-auth";

export function UserMenu() {
  const { user } = useAuth();
  if (!user) return null;

  const name = displayName(user);
  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
      {user.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.picture} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border" />
      ) : (
        <div className="grid place-items-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-medium shrink-0">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{name}</p>
        <p className="text-xs text-muted truncate">{user.email}</p>
      </div>
      <button onClick={logout} title="Sign out" className="text-muted hover:text-foreground transition-colors shrink-0">
        <LogOut size={15} />
      </button>
    </div>
  );
}
