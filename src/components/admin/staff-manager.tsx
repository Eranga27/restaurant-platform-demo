"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  findAccountAction,
  inviteStaffAction,
  resetMfaAction,
  setStaffRoleAction,
} from "@/app/(staff)/admin/staff/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StaffMember } from "@/lib/admin/data";

type Role = "staff" | "manager" | "admin";
const ROLES: [Role, string][] = [
  ["staff", "Staff"],
  ["manager", "Manager"],
  ["admin", "Admin"],
];

type Result = { ok: true } | { ok: false; error: string };

function RolePicker({
  id,
  role,
  branchId,
  branches,
  onChange,
}: {
  id: string;
  role: Role;
  branchId: string | null;
  branches: { id: string; name: string }[];
  onChange: (role: Role, branchId: string | null) => void;
}) {
  const select = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <span className="flex flex-wrap gap-2">
      <Label htmlFor={`${id}-role`} className="sr-only">
        Role
      </Label>
      <select
        id={`${id}-role`}
        value={role}
        onChange={(e) => {
          const next = e.target.value as Role;
          onChange(next, next === "admin" ? null : (branchId ?? branches[0]?.id ?? null));
        }}
        className={select}
      >
        {ROLES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {role !== "admin" && (
        <>
          <Label htmlFor={`${id}-branch`} className="sr-only">
            Branch
          </Label>
          <select
            id={`${id}-branch`}
            value={branchId ?? ""}
            onChange={(e) => onChange(role, e.target.value)}
            className={select}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </>
      )}
    </span>
  );
}

export function StaffManager({
  me,
  members,
  branches,
}: {
  me: string;
  members: StaffMember[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, { role: Role; branchId: string | null }>>({});
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{ userId: string; name: string | null } | null>(null);
  const [newRole, setNewRole] = useState<{ role: Role; branchId: string | null }>({
    role: "staff",
    branchId: branches[0]?.id ?? null,
  });
  const [inviteName, setInviteName] = useState("");
  const [busy, setBusy] = useState(false);
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "";

  async function run(action: () => Promise<Result>, done: string) {
    setBusy(true);
    const result = await action().catch((): Result => ({
      ok: false,
      error: "Something went wrong.",
    }));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(done);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-xl border">
        {members.map((m) => {
          const edit = edits[m.user_id];
          const role = (edit?.role ?? m.role) as Role;
          const branchId = edit?.branchId ?? m.branch_id;
          const self = m.user_id === me;
          return (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-56 flex-1">
                <span className="font-medium">{m.full_name ?? m.email}</span>
                {self && (
                  <Badge variant="outline" className="ml-2">
                    You
                  </Badge>
                )}
                <span className="block text-xs text-muted-foreground">
                  {m.email} · {m.role}
                  {m.branch_id ? ` at ${branchName(m.branch_id)}` : ""}
                </span>
              </span>
              {!self && (
                <>
                  <RolePicker
                    id={m.user_id}
                    role={role}
                    branchId={branchId}
                    branches={branches}
                    onChange={(r, b) =>
                      setEdits((all) => ({ ...all, [m.user_id]: { role: r, branchId: b } }))
                    }
                  />
                  {edit && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await run(
                            () => setStaffRoleAction({ userId: m.user_id, role, branchId }),
                            "Role updated.",
                          )
                        )
                          setEdits(({ [m.user_id]: _done, ...rest }) => rest);
                      }}
                    >
                      Save
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Reset two-step sign-in for ${m.full_name ?? m.email}?`))
                        void run(() => resetMfaAction(m.user_id), "Two-step sign-in reset.");
                    }}
                  >
                    Reset 2-step
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${m.full_name ?? m.email} from staff?`))
                        void run(
                          () =>
                            setStaffRoleAction({
                              userId: m.user_id,
                              role: "customer",
                              branchId: null,
                            }),
                          "Removed from staff.",
                        );
                    }}
                  >
                    Remove
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-4 rounded-xl border p-4">
        <h3 className="font-semibold">Add someone</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFound(null);
              }}
              className="w-72"
            />
          </div>
          <RolePicker
            id="new-staff"
            role={newRole.role}
            branchId={newRole.branchId}
            branches={branches}
            onChange={(role, branchId) => setNewRole({ role, branchId })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || !email}
            onClick={async () => {
              setBusy(true);
              const result = await findAccountAction(email).catch(() => ({
                ok: false as const,
                error: "Something went wrong.",
              }));
              setBusy(false);
              if (result.ok) setFound(result.account);
              else toast.error(result.error);
            }}
          >
            Add an existing account
          </Button>
        </div>
        {found && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3 text-sm">
            <span>
              Found <strong>{found.name ?? email}</strong>.
            </span>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  await run(
                    () => setStaffRoleAction({ userId: found.userId, ...newRole }),
                    "Added to staff.",
                  )
                ) {
                  setFound(null);
                  setEmail("");
                }
              }}
            >
              Make them {newRole.role}
            </Button>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            No account yet? Send an invitation
          </summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="invite-name">Their name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-56"
              />
            </div>
            <Button
              disabled={busy || !email || !inviteName}
              onClick={async () => {
                if (
                  await run(
                    () => inviteStaffAction({ email, name: inviteName, ...newRole }),
                    "Invitation sent.",
                  )
                ) {
                  setEmail("");
                  setInviteName("");
                }
              }}
            >
              Invite as {newRole.role}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Until the site has its own email domain, Supabase only delivers invitations to the
            project&apos;s team members.
          </p>
        </details>
      </div>
    </div>
  );
}
