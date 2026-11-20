import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanZoo - Project management for small teams",
  description: "Plan projects, assign tasks and collaborate with your team on a simple kanban board.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
