"use client";

import { useState, useActionState } from "react";
import { updatePlatformRole, revokeAdminAssignment } from "./actions";
import type { AdminRole } from "@/lib/admin-auth";

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

const ROLE_COLORS: Record<string, string> = {
  platform_admin: "border-destructive/40 bg-destructive/15 text-destructive",
  org_admin: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  org_manager: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  member: "border-border bg-secondary/50 text-muted-foreground",
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
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {members.length} members
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Role</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground md:table-cell">Organization</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-muted-foreground lg:table-cell">Joined</th>
              {canEditRole && (
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3">
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
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.platform_role] ?? ROLE_COLORS.member}`}>
                    {member.platform_role.replace(/_/g, " ")}
                  </span>
                  {member.assignment_role && member.assignment_role !== member.platform_role && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (assigned: {member.assignment_role.replace(/_/g, " ")})
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {member.source_org_name ?? member.assignment_wl_name ?? "None"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </td>
                {canEditRole && (
                  <td className="px-4 py-3 text-right">
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
                              className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              Revoke
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                    {member.id === currentUserId && (
                      <span className="text-xs text-muted-foreground">You</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEditRole ? 5 : 4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {revokeState.error && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {revokeState.error}
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Change Role</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {editingUser.display_name} ({editingUser.email})
            </p>

            {roleState.error && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
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
          </div>
        </div>
      )}
    </div>
  );
}
