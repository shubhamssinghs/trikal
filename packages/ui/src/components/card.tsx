import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = "", title }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-800 bg-gray-900 p-4 ${className}`}>
      {title && <h2 className="text-sm font-medium text-gray-300 mb-3">{title}</h2>}
      {children}
    </div>
  );
}
