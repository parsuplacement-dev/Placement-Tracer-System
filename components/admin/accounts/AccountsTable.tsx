"use client";

import { Button } from "@/components/ui/button";
import { TableActionMenu } from "@/components/ui/table-action-menu";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuEye, LuShieldCheck, LuTrash2 } from "@/components/ui/icons";
import {
  COORDINATOR_SCOPE_TYPES,
  ROLES,
  type CoordinatorScopeGrant,
  type CoordinatorScopeType,
  type Role,
} from "@/types";
import { useToast } from "@/components/ui/Toast";
import { friendlyRequestMessage } from "@/lib/api/client-errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Modal, { ModalActions, ModalNotice } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import {
  SortableTableHead,
  type SortDirection,
} from "@/components/ui/sortable-table-head";
import { TableContentState } from "@/components/ui/table-content-state";
import { CopyButton } from "@/components/ui/copy-button";
import { createConfirmationCode } from "@/lib/confirmation-code";
import {
  CAMPUSES,
  getCollegesForCampus,
  getProgramsForCollege,
} from "@/lib/programs/catalog";
import { SelectField } from "@/components/forms/SelectField";

interface Account {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
  role: Role;
  coordinatorGrants: CoordinatorScopeGrant[];
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServerDataResponse {
  accounts: Account[];
  success: boolean;
}

interface AccountsTableProps {
  currentPage: number;
  searchQuery: string;
  onPageChange: (page: number) => void;
  currentUserId: string;
  roleFilter: Role | "";
}

type AccountSortKey =
  "name" | "email" | "role" | "verified" | "createdAt" | "updatedAt";

export default function AccountsTable({
  currentPage,
  searchQuery,
  onPageChange,
  currentUserId,
  roleFilter,
}: AccountsTableProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [accountToView, setAccountToView] = useState<Account | null>(null);
  const [roleChange, setRoleChange] = useState<{
    account: Account;
    role: Role;
    coordinatorGrants: CoordinatorScopeGrant[];
  } | null>(null);
  const [newScopeType, setNewScopeType] =
    useState<CoordinatorScopeType>("campus");
  const [newScopeCampus, setNewScopeCampus] = useState("");
  const [newScopeCollege, setNewScopeCollege] = useState("");
  const [newScopeProgram, setNewScopeProgram] = useState("");
  const [roleConfirmation, setRoleConfirmation] = useState("");
  const [roleConfirmationCode, setRoleConfirmationCode] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  const [sortKey, setSortKey] = useState<AccountSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const router = useRouter();
  const { showToast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    async function fetchAccounts() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/accounts", {
          cache: "no-store",
          credentials: "include",
        });

        const data: ServerDataResponse = await res.json();

        if (!res.ok) {
          throw new Error("Failed to load accounts.");
        }

        let filtered = data.accounts ?? [];

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();

          filtered = filtered.filter(
            (account) =>
              account.name.toLowerCase().includes(query) ||
              account.email.toLowerCase().includes(query),
          );
        }

        if (roleFilter) {
          filtered = filtered.filter((account) => account.role === roleFilter);
        }

        filtered.sort((left, right) => {
          const leftValue = left[sortKey];
          const rightValue = right[sortKey];
          const comparison =
            typeof leftValue === "boolean" && typeof rightValue === "boolean"
              ? Number(leftValue) - Number(rightValue)
              : String(leftValue).localeCompare(String(rightValue), undefined, {
                  numeric: true,
                  sensitivity: "base",
                });

          return sortDirection === "asc" ? comparison : -comparison;
        });

        if (cancelled) return;

        setTotalRows(filtered.length);

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        setAccounts(filtered.slice(start, end));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            friendlyRequestMessage(
              err,
              "An error occurred on our end and we couldn’t retrieve the accounts.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAccounts();

    return () => {
      cancelled = true;
    };
  }, [currentPage, reloadKey, roleFilter, searchQuery, sortDirection, sortKey]);

  const handleSort = (key: AccountSortKey) => {
    setSortDirection((current) =>
      sortKey === key ? (current === "asc" ? "desc" : "asc") : "asc",
    );
    setSortKey(key);
    onPageChange(1);
  };

  const openAccount = (account: Account) => {
    setAccountToView(account);
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "button,a,input,select,textarea,[role='menuitem'],[data-row-action]",
      ),
    );

  const roleConfirmationAction =
    roleChange?.role === ROLES.ADMIN
      ? "PROMOTE TO ADMIN"
      : roleChange?.role === ROLES.COORDINATOR
        ? roleChange.account.role === ROLES.COORDINATOR
          ? "UPDATE COORDINATOR ACCESS"
          : "PROMOTE TO COORDINATOR"
        : "DEMOTE TO ALUMNI";
  const requiredRoleConfirmation = `${roleConfirmationAction} ${roleConfirmationCode}`;
  const requiredDeleteConfirmation = `DELETE ${deleteConfirmationCode}`;
  const normalizedRoleConfirmation = roleConfirmation.trim().toUpperCase();

  function openDeleteConfirmation(account: Account) {
    setDeleteConfirmation("");
    setDeleteConfirmationCode(createConfirmationCode());
    setAccountToDelete(account);
  }

  function openRoleConfirmation(account: Account, role: Role) {
    setRoleConfirmation("");
    setRoleConfirmationCode(createConfirmationCode());
    setNewScopeType(COORDINATOR_SCOPE_TYPES.CAMPUS);
    setNewScopeCampus("");
    setNewScopeCollege("");
    setNewScopeProgram("");
    setRoleChange({
      account,
      role,
      coordinatorGrants:
        role === ROLES.COORDINATOR
          ? account.coordinatorGrants.map((grant) => ({ ...grant }))
          : [],
    });
  }

  function addCoordinatorGrant() {
    if (!roleChange || roleChange.role !== ROLES.COORDINATOR) return;
    const grant: CoordinatorScopeGrant = {
      scopeType: newScopeType,
      campus: newScopeCampus,
      college: newScopeType === "campus" ? null : newScopeCollege || null,
      program: newScopeType === "program" ? newScopeProgram || null : null,
    };
    if (
      !grant.campus ||
      (grant.scopeType !== "campus" && !grant.college) ||
      (grant.scopeType === "program" && !grant.program)
    ) {
      return;
    }
    const key = [
      grant.scopeType,
      grant.campus,
      grant.college,
      grant.program,
    ].join("\u0000");
    setRoleChange((current) => {
      if (!current) return current;
      const exists = current.coordinatorGrants.some(
        (item) =>
          [item.scopeType, item.campus, item.college, item.program].join(
            "\u0000",
          ) === key,
      );
      return exists
        ? current
        : {
            ...current,
            coordinatorGrants: [...current.coordinatorGrants, grant],
          };
    });
    setNewScopeProgram("");
  }

  const closeRoleChange = () => {
    if (changingRole) return;
    setRoleChange(null);
    setRoleConfirmation("");
    setRoleConfirmationCode("");
  };

  const confirmRoleChange = async () => {
    if (!roleChange || normalizedRoleConfirmation !== requiredRoleConfirmation)
      return;
    if (
      roleChange.role === ROLES.COORDINATOR &&
      roleChange.coordinatorGrants.length === 0
    ) {
      showToast({
        message: "Add at least one coordinator assignment.",
        type: "error",
      });
      return;
    }
    setChangingRole(true);

    try {
      const res = await fetch(`/api/admin/accounts/${roleChange.account.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_access",
          role: roleChange.role,
          coordinatorGrants: roleChange.coordinatorGrants,
          confirmation: normalizedRoleConfirmation,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message ?? "Failed to change account role.");

      const updatedAccount = data.account as Account;
      if (roleFilter && roleFilter !== updatedAccount.role) {
        setAccounts((current) =>
          current.filter((account) => account.id !== roleChange.account.id),
        );
        setTotalRows((current) => Math.max(0, current - 1));
      } else {
        setAccounts((current) =>
          current.map((account) =>
            account.id === roleChange.account.id ? updatedAccount : account,
          ),
        );
      }
      showToast({ message: data.message, type: "success" });
      setRoleChange(null);
      setRoleConfirmation("");
      setRoleConfirmationCode("");
      router.refresh();
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to change account role.",
        type: "error",
      });
    } finally {
      setChangingRole(false);
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete || deleteConfirmation !== requiredDeleteConfirmation)
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? "Failed to delete account.");
      }

      setAccounts((prev) =>
        prev.filter((account) => account.id !== accountToDelete.id),
      );
      setTotalRows((prev) => Math.max(0, prev - 1));
      setAccountToDelete(null);
      setDeleteConfirmation("");
      setDeleteConfirmationCode("");

      showToast({
        message: "Account deleted successfully.",
        type: "success",
      });

      router.refresh();
    } catch (err: unknown) {
      showToast({
        message:
          err instanceof Error ? err.message : "Failed to delete account.",
        type: "error",
      });

      setAccountToDelete(null);
      setDeleteConfirmation("");
      setDeleteConfirmationCode("");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-border bg-card text-sm shadow-sm">
      <Table>
        {!loading && (
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHead
                direction={sortKey === "name" ? sortDirection : undefined}
                onSort={() => handleSort("name")}
              >
                Full Name
              </SortableTableHead>
              <SortableTableHead
                direction={sortKey === "email" ? sortDirection : undefined}
                onSort={() => handleSort("email")}
              >
                Email
              </SortableTableHead>
              <SortableTableHead
                align="center"
                direction={sortKey === "role" ? sortDirection : undefined}
                onSort={() => handleSort("role")}
              >
                Role
              </SortableTableHead>
              <SortableTableHead
                align="center"
                direction={sortKey === "verified" ? sortDirection : undefined}
                onSort={() => handleSort("verified")}
              >
                Verified
              </SortableTableHead>
              <SortableTableHead
                direction={sortKey === "createdAt" ? sortDirection : undefined}
                onSort={() => handleSort("createdAt")}
              >
                Created
              </SortableTableHead>
              <SortableTableHead
                direction={sortKey === "updatedAt" ? sortDirection : undefined}
                onSort={() => handleSort("updatedAt")}
              >
                Updated
              </SortableTableHead>

              <TableHead className="text-center">Menu</TableHead>
            </TableRow>
          </TableHeader>
        )}

        <TableBody aria-busy={loading}>
          {loading ? (
            <TableContentState
              colSpan={7}
              loadingMessage="Loading accounts..."
            />
          ) : error ? (
            <TableContentState
              colSpan={7}
              error={error}
              retryLabel="Refresh accounts"
              onRetry={() => setReloadKey((current) => current + 1)}
            />
          ) : totalRows === 0 ? (
            <TableContentState colSpan={7}>
              <div className="text-center text-muted-foreground">
                No accounts found.
              </div>
            </TableContentState>
          ) : (
            accounts.map((account) => (
              <TableRow
                key={account.id}
                tabIndex={0}
                aria-label={`View account for ${account.name || account.email}`}
                onPointerUp={(event) => {
                  if (
                    event.pointerType === "mouse" ||
                    isInteractiveTarget(event.target)
                  ) {
                    return;
                  }
                  openAccount(account);
                }}
                onDoubleClick={(event) => {
                  if (isInteractiveTarget(event.target)) return;
                  openAccount(account);
                }}
                onKeyDown={(event) => {
                  if (
                    (event.key !== "Enter" && event.key !== " ") ||
                    isInteractiveTarget(event.target)
                  ) {
                    return;
                  }
                  event.preventDefault();
                  openAccount(account);
                }}
                className="cursor-pointer select-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_*]:[-webkit-tap-highlight-color:transparent]"
              >
                <TableCell className="font-semibold whitespace-nowrap text-foreground">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      name={account.name}
                      pictureUrl={account.pictureUrl}
                      size={36}
                    />
                    <div className="flex items-center gap-1.5">
                      {account.name ? (
                        `${account.name}${account.id === currentUserId ? " (You)" : ""}`
                      ) : (
                        <span className="italic text-muted-foreground">
                          Unnamed User
                          {account.id === currentUserId ? " (You)" : ""}
                        </span>
                      )}
                      <CopyButton
                        value={account.name || "Unnamed User"}
                        label={`Copy ${account.name || "Unnamed User"}`}
                      />
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span>{account.email}</span>
                    <CopyButton
                      value={account.email}
                      label={`Copy ${account.email}`}
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                        account.role === "admin"
                          ? "bg-secondary text-secondary-foreground border border-border"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {account.role}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
                        account.verified
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {account.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(account.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>

                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(account.updatedAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>

                <TableCell>
                  <div className="flex justify-center">
                    <TableActionMenu
                      label={`Actions for ${account.name}`}
                      items={[
                        {
                          label: "View Account",
                          icon: <LuEye aria-hidden="true" size={16} animated />,
                          onSelect: () => openAccount(account),
                        },
                        ...(account.id !== currentUserId
                          ? account.role === ROLES.ALUMNI
                            ? [
                                {
                                  label: "Promote to Admin",
                                  icon: (
                                    <LuShieldCheck
                                      aria-hidden="true"
                                      size={16}
                                    />
                                  ),
                                  variant: "success" as const,
                                  onSelect: () =>
                                    openRoleConfirmation(account, ROLES.ADMIN),
                                },
                                {
                                  label: "Promote to Coordinator",
                                  icon: (
                                    <LuShieldCheck
                                      aria-hidden="true"
                                      size={16}
                                    />
                                  ),
                                  variant: "secondary" as const,
                                  onSelect: () =>
                                    openRoleConfirmation(
                                      account,
                                      ROLES.COORDINATOR,
                                    ),
                                },
                              ]
                            : account.role === ROLES.COORDINATOR
                              ? [
                                  {
                                    label: "Manage Coordinator Access",
                                    icon: (
                                      <LuShieldCheck
                                        aria-hidden="true"
                                        size={16}
                                      />
                                    ),
                                    variant: "secondary" as const,
                                    onSelect: () =>
                                      openRoleConfirmation(
                                        account,
                                        ROLES.COORDINATOR,
                                      ),
                                  },
                                  {
                                    label: "Promote to Admin",
                                    icon: (
                                      <LuShieldCheck
                                        aria-hidden="true"
                                        size={16}
                                      />
                                    ),
                                    variant: "success" as const,
                                    onSelect: () =>
                                      openRoleConfirmation(
                                        account,
                                        ROLES.ADMIN,
                                      ),
                                  },
                                  {
                                    label: "Demote to Alumni",
                                    icon: (
                                      <LuShieldCheck
                                        aria-hidden="true"
                                        size={16}
                                      />
                                    ),
                                    variant: "destructive" as const,
                                    onSelect: () =>
                                      openRoleConfirmation(
                                        account,
                                        ROLES.ALUMNI,
                                      ),
                                  },
                                ]
                              : [
                                  {
                                    label: "Demote to Alumni",
                                    icon: (
                                      <LuShieldCheck
                                        aria-hidden="true"
                                        size={16}
                                      />
                                    ),
                                    variant: "destructive" as const,
                                    onSelect: () =>
                                      openRoleConfirmation(
                                        account,
                                        ROLES.ALUMNI,
                                      ),
                                  },
                                ]
                          : []),
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Modal
        open={accountToView !== null}
        onClose={() => setAccountToView(null)}
        title="Account details"
        width="md"
        fitContent
      >
        {accountToView && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  name={accountToView.name}
                  pictureUrl={accountToView.pictureUrl}
                  size={56}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full name
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-xl font-semibold text-foreground">
                      {accountToView.name || "Unnamed User"}
                    </p>
                    <CopyButton
                      value={accountToView.name || "Unnamed User"}
                      label="Copy full name"
                    />
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  accountToView.verified
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {accountToView.verified ? "Verified" : "Pending"}
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <p className="break-all text-sm text-foreground">
                  {accountToView.email}
                </p>
                <CopyButton
                  value={accountToView.email}
                  label="Copy email address"
                />
              </div>
            </div>

            <dl className="grid gap-4 rounded-2xl border border-border bg-muted p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 font-medium capitalize text-foreground">
                  {accountToView.role}
                </dd>
              </div>
              {accountToView.role === ROLES.COORDINATOR && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Coordinator assignments
                  </dt>
                  <dd className="mt-2 space-y-1 text-sm text-foreground">
                    {accountToView.coordinatorGrants.map((grant, index) => (
                      <div key={grant.id ?? index}>
                        {grant.campus}
                        {grant.college ? ` / ${grant.college}` : ""}
                        {grant.program ? ` / ${grant.program}` : ""}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account ID
                </dt>
                <dd className="mt-1 break-all text-sm text-foreground">
                  {accountToView.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(accountToView.createdAt).toLocaleString("en-PH")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Updated
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(accountToView.updatedAt).toLocaleString("en-PH")}
                </dd>
              </div>
            </dl>

            {accountToView.id !== currentUserId && (
              <ModalActions>
                {accountToView.role === "alumni" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      const account = accountToView;
                      setAccountToView(null);
                      openDeleteConfirmation(account);
                    }}
                  >
                    <LuTrash2 aria-hidden="true" animated />
                    Delete Account
                  </Button>
                )}
                {accountToView.role === ROLES.COORDINATOR && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const account = accountToView;
                      setAccountToView(null);
                      openRoleConfirmation(account, ROLES.COORDINATOR);
                    }}
                  >
                    <LuShieldCheck aria-hidden="true" />
                    Manage Access
                  </Button>
                )}
                {accountToView.role === ROLES.ALUMNI && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const account = accountToView;
                      setAccountToView(null);
                      openRoleConfirmation(account, ROLES.COORDINATOR);
                    }}
                  >
                    <LuShieldCheck aria-hidden="true" />
                    Promote to Coordinator
                  </Button>
                )}
                <Button
                  type="button"
                  variant={
                    accountToView.role === ROLES.ALUMNI
                      ? "success"
                      : "destructive"
                  }
                  onClick={() => {
                    const account = accountToView;
                    setAccountToView(null);
                    openRoleConfirmation(
                      account,
                      account.role === ROLES.ALUMNI
                        ? ROLES.ADMIN
                        : ROLES.ALUMNI,
                    );
                  }}
                >
                  <LuShieldCheck aria-hidden="true" />
                  {accountToView.role === ROLES.ALUMNI
                    ? "Promote to Admin"
                    : "Demote to Alumni"}
                </Button>
              </ModalActions>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={accountToDelete !== null}
        onClose={() => {
          if (deleting) return;
          setAccountToDelete(null);
          setDeleteConfirmation("");
          setDeleteConfirmationCode("");
        }}
        title="Permanently delete account?"
        description={accountToDelete?.email}
        width="md"
        fitContent
        showCloseButton={!deleting}
      >
        <div className="space-y-5">
          <ModalNotice title="This action cannot be undone" tone="danger">
            <p>
              The login account, all draft responses, draft manual imports,
              draft documents, and their Google Drive folders will be
              permanently deleted.
            </p>
          </ModalNotice>

          <div>
            <p className="text-sm font-semibold text-foreground">
              After deletion:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
              <li>The person can no longer sign in with this account</li>
              <li>
                All unfinished drafts and their files are permanently removed
              </li>
              <li>
                Submitted tracer responses remain available as institutional
                records
              </li>
              <li>A new sign-in may create a separate account in the future</li>
            </ul>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Type the confirmation phrase below to continue
            </span>
            <span className="mt-2 block select-none rounded-xl border border-border bg-muted px-4 py-3 text-center font-mono text-base font-semibold tracking-widest text-foreground">
              {requiredDeleteConfirmation}
            </span>
            <Input
              className="mt-2"
              value={deleteConfirmation}
              disabled={deleting}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />
          </label>

          <ModalActions>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setAccountToDelete(null);
                setDeleteConfirmation("");
                setDeleteConfirmationCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleting || deleteConfirmation !== requiredDeleteConfirmation
              }
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting account..." : "Delete Account"}
            </Button>
          </ModalActions>
        </div>
      </Modal>
      <Modal
        open={roleChange !== null}
        onClose={closeRoleChange}
        title={
          roleChange?.role === ROLES.ADMIN
            ? "Promote account to administrator?"
            : roleChange?.role === ROLES.COORDINATOR
              ? roleChange.account.role === ROLES.COORDINATOR
                ? "Manage coordinator access"
                : "Promote account to coordinator?"
              : "Demote account to alumni?"
        }
        width="xl"
        fitContent
        showCloseButton={!changingRole}
      >
        <div className="space-y-5">
          <ModalNotice title="Important data and access warning" tone="warning">
            <p>
              {roleChange?.account.role === roleChange?.role
                ? "Saving these assignments changes which organizational records this coordinator can access immediately. Existing submitted records are not deleted."
                : "Changing this role permanently deletes every draft owned by this account, including draft alumni responses, draft manual imports, uploaded documents, and their Google Drive folders. Submitted responses and completed manual imports are retained."}
            </p>
          </ModalNotice>

          {roleChange?.role === ROLES.ADMIN ? (
            <div>
              <p className="text-sm font-semibold text-foreground">
                This person will receive access to:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                <li>All alumni responses and personally identifiable data</li>
                <li>Manual response creation, editing, imports, and exports</li>
                <li>Study scheduling, opening, closing, and archiving</li>
                <li>Google Drive folders, uploads, downloads, and deletion</li>
                <li>Account deletion and administrator role management</li>
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Submitted alumni responses remain stored, but all drafts are
                permanently deleted. This account will use the administrator
                portal after its next authorization check.
              </p>
            </div>
          ) : roleChange?.role === ROLES.COORDINATOR ? (
            <div>
              <p className="text-sm font-semibold text-foreground">
                This person can view and manage responses belonging to the
                assignments listed below.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Campus, college, and program assignments can be combined. Study
                lifecycle, account management, and unrestricted Drive access
                remain administrator-only.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                This person will lose access to:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                <li>The admin dashboard and all-account response views</li>
                <li>Manual response and import management</li>
                <li>Study scheduling and lifecycle controls</li>
                <li>Google Drive administration and system-wide exports</li>
                <li>Account deletion and role management</li>
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Completed manual imports remain available to other
                administrators, and submitted alumni responses remain associated
                with the account. All drafts are permanently deleted. They will
                regain alumni survey access.
              </p>
            </div>
          )}

          {roleChange && (
            <div className="rounded-2xl border border-border bg-muted/60 p-5">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  name={roleChange.account.name}
                  pictureUrl={roleChange.account.pictureUrl}
                  size={72}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xl font-semibold text-foreground">
                      {roleChange.account.name || "Unnamed User"}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        roleChange.account.verified
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {roleChange.account.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {roleChange.account.email}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium capitalize text-foreground">
                      {roleChange.account.role}
                    </span>
                    <span aria-hidden="true" className="text-muted-foreground">
                      →
                    </span>
                    <span className="rounded-lg bg-primary/10 px-3 py-1.5 font-semibold capitalize text-primary">
                      {roleChange.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {roleChange?.role === ROLES.COORDINATOR && (
            <section className="space-y-4 rounded-2xl border border-border bg-background p-5">
              <div>
                <h3 className="font-semibold text-foreground">
                  Coordinator assignments
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add any combination. Overlapping assignments are safely
                  deduplicated when access is calculated.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  id="coordinator-scope-type"
                  label="Assignment type"
                  value={newScopeType}
                  onChange={(value) => {
                    setNewScopeType(value as CoordinatorScopeType);
                    setNewScopeCollege("");
                    setNewScopeProgram("");
                  }}
                  options={[
                    { value: "campus", label: "Entire campus" },
                    { value: "college", label: "Entire college" },
                    { value: "program", label: "Specific program" },
                  ]}
                />
                <SelectField
                  id="coordinator-scope-campus"
                  label="Campus"
                  value={newScopeCampus}
                  onChange={(value) => {
                    setNewScopeCampus(value);
                    setNewScopeCollege("");
                    setNewScopeProgram("");
                  }}
                  options={CAMPUSES}
                  placeholder="Select campus"
                />
                {newScopeType !== COORDINATOR_SCOPE_TYPES.CAMPUS && (
                  <SelectField
                    id="coordinator-scope-college"
                    label="College"
                    value={newScopeCollege}
                    onChange={(value) => {
                      setNewScopeCollege(value);
                      setNewScopeProgram("");
                    }}
                    options={getCollegesForCampus(newScopeCampus)}
                    placeholder="Select college"
                  />
                )}
                {newScopeType === COORDINATOR_SCOPE_TYPES.PROGRAM && (
                  <SelectField
                    id="coordinator-scope-program"
                    label="Program"
                    value={newScopeProgram}
                    onChange={setNewScopeProgram}
                    options={getProgramsForCollege(
                      newScopeCampus,
                      newScopeCollege,
                    )}
                    placeholder="Select program"
                  />
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addCoordinatorGrant}
                disabled={
                  !newScopeCampus ||
                  (newScopeType !== COORDINATOR_SCOPE_TYPES.CAMPUS &&
                    !newScopeCollege) ||
                  (newScopeType === COORDINATOR_SCOPE_TYPES.PROGRAM &&
                    !newScopeProgram)
                }
              >
                Add Assignment
              </Button>

              <div className="space-y-2">
                {roleChange.coordinatorGrants.length === 0 ? (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Add at least one assignment.
                  </p>
                ) : (
                  roleChange.coordinatorGrants.map((grant, index) => (
                    <div
                      key={`${grant.scopeType}-${grant.campus}-${grant.college}-${grant.program}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3"
                    >
                      <p className="min-w-0 flex-1 text-sm text-foreground">
                        <span className="font-semibold capitalize">
                          {grant.scopeType}:
                        </span>{" "}
                        {grant.campus}
                        {grant.college ? ` / ${grant.college}` : ""}
                        {grant.program ? ` / ${grant.program}` : ""}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRoleChange((current) =>
                            current
                              ? {
                                  ...current,
                                  coordinatorGrants:
                                    current.coordinatorGrants.filter(
                                      (_, grantIndex) => grantIndex !== index,
                                    ),
                                }
                              : current,
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Type the confirmation phrase below to continue
            </span>
            <span className="mt-2 block select-none rounded-xl border border-border bg-muted px-4 py-3 text-center font-mono text-base font-semibold tracking-widest text-foreground">
              {requiredRoleConfirmation}
            </span>
            <Input
              className="mt-2"
              value={roleConfirmation}
              disabled={changingRole}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setRoleConfirmation(event.target.value)}
            />
          </label>

          <ModalActions>
            <Button
              type="button"
              variant="outline"
              disabled={changingRole}
              onClick={closeRoleChange}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                changingRole ||
                normalizedRoleConfirmation !== requiredRoleConfirmation
              }
              onClick={() => void confirmRoleChange()}
            >
              {changingRole
                ? "Changing role..."
                : roleChange?.role === ROLES.ADMIN
                  ? "Promote to Admin"
                  : roleChange?.role === ROLES.COORDINATOR
                    ? roleChange.account.role === ROLES.COORDINATOR
                      ? "Save Coordinator Access"
                      : "Promote to Coordinator"
                    : "Demote to Alumni"}
            </Button>
          </ModalActions>
        </div>
      </Modal>
      {totalRows > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 p-4 text-sm sm:px-6">
          {totalRows > 1 ? (
            <span className="rounded-lg bg-muted/60 px-4 py-2 font-semibold whitespace-nowrap text-muted-foreground">
              Showing <span>{accounts.length}</span> of{" "}
              <span>{totalRows} Entries</span>
            </span>
          ) : (
            <span className="rounded-lg bg-muted/60 px-4 py-2 font-semibold whitespace-nowrap text-muted-foreground">
              Showing 1 Entry
            </span>
          )}

          <div className="ml-auto flex gap-2">
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              variant="default"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
