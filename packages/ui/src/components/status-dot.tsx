import React from "react";

type Status = "active" | "at-risk" | "on-hold" | "completed" | "archived";

const statusColors: Record<Status, string> = {
  active: "bg-emerald-500",
  "at-risk": "bg-amber-500",
  "on-hold": "bg-gray-500",
  completed: "bg-blue-500",
  archived: "bg-gray-700",
};

export function StatusDot({ status }: { status: Status }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${statusColors[status]}`} />
  );
}
