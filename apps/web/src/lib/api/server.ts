import { cookies } from "next/headers";

const IAPI = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Server-side fetch that forwards the incoming request's cookies to the API,
 * so SSR data loads authenticate as the logged-in user.
 */
export async function serverFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const store = await cookies();
    const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(`${IAPI}${path}`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
