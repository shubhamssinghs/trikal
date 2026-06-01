"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";

const stats = [
  { title: "Active Users", value: "—", icon: Users, description: "Total active accounts" },
  { title: "Sessions Today", value: "—", icon: Activity, description: "Authenticated sessions" },
  { title: "Compliance Status", value: "Active", icon: ShieldCheck, description: "Audit logging enabled" },
];

export default function DashboardPage() {
  const name = useAuthStore((s) => s.name);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{mounted && name ? `, ${name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
