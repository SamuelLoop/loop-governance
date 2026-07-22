import type { Metadata } from "next";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin | Loop_cmbntr",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold text-neutral-100">
        Platform Admin
      </h1>
      <p className="mb-10 text-sm text-neutral-500">
        Admin tools for managing AI expert accounts and platform activity.
      </p>
      <AdminPanel />
    </div>
  );
}
