"use client";

// Auth is provided by AuthProvider (single /me fetch shared via context).
export { useAuth, login, logout, displayName, type AuthUser } from "./auth-provider";
