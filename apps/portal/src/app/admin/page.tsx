import type { Metadata } from "next";
import type { ReactElement } from "react";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin | Loop_cmbntr",
};

export default function AdminPage(): ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold text-text-primary">
        Platform Admin
      </h1>
      <p className="mb-10 text-sm text-text-secondary">
        Admin tools for managing AI expert accounts and platform activity.
      </p>
      <AdminPanel />
    </div>
  );
}
