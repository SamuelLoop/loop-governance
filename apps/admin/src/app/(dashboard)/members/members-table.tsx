"use client";

import { useState, useActionState } from "react";
import { updatePlatformRole, revokeAdminAssignment } from "./actions";
import type { AdminRole } from "@/lib/admin-auth";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  DataTableEmpty,
  StatusChip,
  Glass,
  type StatusChipVariant,
} from "@loop/ui";

type Member = {
  id: string;
  display_name: string;
  email: string;
  platform_role: string;
  avatar_url: string | null;
  source_white_label_id: string | null;
  source_org_name: string | null;
  created_at: string;
  assignment_id: string | null;
  assignment_role: string | null;
  assignment_wl_name: string | null;
};

type Org = { id: string; name: string };

// See packages/ui/src/components/status-chip.tsx: platform_admin is the
// highest-privilege role (genuinely "pay attention") so it gets "error";
// org_admin is next most sensitive so "warning"; org_manager/member are
// both low-privilege and render neutral, differentiated by label text.
const ROLE_VARIANT: Record<string, StatusChipVariant> = {
  platform_admin: "error",
  org_admin: "warning",
  org_manager: "neutral",
  member: "neutral",
};

export function MembersTable({
  members,
  orgs,
  currentUserId,
  viewerRole,
}: {
  members: Member[];
  orgs: Org[];
  currentUserId: string;
  viewerRole: AdminRole;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<Member | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");

  const [roleState, roleAction] = useActionState(updatePlatformRole, { error: "" });
  const [revokeState, revokeAction] = useActionState(revokeAdminAssignment, { error: "" });

  const filtered = members.filter((m) => {
    if (roleFilter !== "all" && m.platform_role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.display_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const canEditRole = viewerRole === "platform_admin" || viewerRole === "org_admin";
  const availableRoles = viewerRole === "platform_admin"
    ? ["member", "org_manager", "org_admin", "platform_admin"]
    : ["member", "org_manager", "org_admin"];

  function openEdit(member: Member) {
    setEditingUser(member);
    setSelectedRole(member.platform_role);
    setSelectedOrg(member.source_white_label_id ?? orgs[0]?.id ?? "");
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">All roles</option>
          <option value="platform_admin">Platform Admin</option>
          <option value="org_admin">Org Admin</option>
          <option value="org_manager">Org Manager</option>
          <option value="member">Member</option>
        </select>
        <span className="text-caption text-text-secondary">
          {filtered.length} of {members.length} members
        </span>
      </div>

      {/* Table */}
      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>User</DataTableHead>
            <DataTableHead>Role</DataTableHead>
            <DataTableHead className="hidden md:table-cell">Organization</DataTableHead>
            <DataTableHead className="hidden lg:table-cell">Joined</DataTableHead>
            {canEditRole && <DataTableHead align="right">Actions</DataTableHead>}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {filtered.map((member) => (
            <DataTableRow key={member.id}>
              <DataTableCell>
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                      {member.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{member.display_name}</p>
                    <p className="text-caption text-text-secondary">{member.email}</p>
                  </div>
                </div>
              </DataTableCell>
              <DataTableCell>
                <StatusChip variant={ROLE_VARIANT[member.platform_role] ?? "neutral"}>
                  {member.platform_role.replace(/_/g, " ")}
                </StatusChip>
                {member.assignment_role && member.assignment_role !== member.platform_role && (
                  <span className="ml-1 text-caption text-text-secondary">
                    (assigned: {member.assignment_role.replace(/_/g, " ")})
                  </span>
                )}
              </DataTableCell>
              <DataTableCell className="hidden text-text-secondary md:table-cell">
                {member.source_org_name ?? member.assignment_wl_name ?? "None"}
              </DataTableCell>
              <DataTableCell numeric className="hidden text-text-secondary lg:table-cell">
                {new Date(member.created_at).toLocaleDateString()}
              </DataTableCell>
              {canEditRole && (
                <DataTableCell align="right">
                  {member.id !== currentUserId && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(member)}
                        className="rounded-md px-2 py-1 text-xs text-primary hover:bg-secondary transition-colors"
                      >
                        Edit role
                      </button>
                      {member.assignment_id && (
                        <form action={revokeAction}>
                          <input type="hidden" name="assignment_id" value={member.assignment_id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-xs text-error hover:bg-error/10 transition-colors"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                  {member.id === currentUserId && (
                    <span className="text-caption text-text-secondary">You</span>
                  )}
                </DataTableCell>
              )}
            </DataTableRow>
          ))}
          {filtered.length === 0 && (
            <DataTableEmpty colSpan={canEditRole ? 5 : 4}>No members found</DataTableEmpty>
          )}
        </DataTableBody>
      </DataTable>

      {revokeState.error && (
        <div className="mt-3 rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
          {revokeState.error}
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingUser(null)}>
          <Glass space="admin" className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h2 font-bold">Change Role</h3>
            <p className="mt-1 text-body text-text-secondary">
              {editingUser.display_name} ({editingUser.email})
            </p>

            {roleState.error && (
              <div className="mt-3 rounded-md border border-error/30 bg-error/10 px-4 py-2.5 text-sm text-error">
                {roleState.error}
              </div>
            )}

            <form action={roleAction} className="mt-4 space-y-4">
              <input type="hidden" name="user_id" value={editingUser.id} />
              <input type="hidden" name="previous_role" value={editingUser.platform_role} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              {(selectedRole === "org_admin" || selectedRole === "org_manager") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Organization</label>
                  <select
                    name="white_label_id"
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                    {orgs.length === 0 && (
                      <option value="" disabled>No organizations configured</option>
                    )}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => setTimeout(() => setEditingUser(null), 500)}
                >
                  Save
                </button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}
