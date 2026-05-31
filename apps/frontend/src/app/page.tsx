import Image from "next/image";
import { apiClient } from "@/lib/api-client";

export default async function Home() {
  let healthStatus = "loading...";
  try {
    const res = await apiClient.get("/health");
    healthStatus = res.data.status || "connected";
  } catch {
    healthStatus = "backend unavailable";
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="w-32 h-32">
        <Image
          src="/trikal-logo.svg"
          alt="Trikal Logo"
          width={128}
          height={128}
          className="w-full h-full"
          priority
        />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Trikal</h1>
      <p className="text-muted-foreground">
        Backend status:{" "}
        <code className="rounded bg-muted px-2 py-1 text-sm">
          {healthStatus}
        </code>
      </p>
    </main>
  );
}
