"use client";

import { SearchInput } from "@/components/ui/search-input";

import { useState } from "react";
import AccountsTable from "@/components/admin/accounts/AccountsTable";
import ExportButton from "@/components/admin/ExportButton";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { SelectField } from "@/components/forms/SelectField";
import type { Role } from "@/types";

export default function AccountsWorkspace({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebouncedValue(searchInput, 200);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<Role | "">("");

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 p-5 shadow-lg">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Accounts
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
            Manage administrator, coordinator, and alumni accounts.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 basis-80 flex-wrap items-center justify-end gap-2">
          <ExportButton baseUrl="/api/admin/accounts/export" />
          <label className="min-w-56 flex-1">
            <SearchInput
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="w-full md:max-w-xs">
          <SelectField
            id="account-role-filter"
            label="Filter by role"
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value as Role | "");
              setCurrentPage(1);
            }}
            options={[
              { value: "", label: "All roles" },
              { value: "admin", label: "Administrators" },
              { value: "coordinator", label: "Coordinators" },
              { value: "alumni", label: "Alumni" },
            ]}
            placeholder="All roles"
          />
        </div>
      </section>

      <AccountsTable
        currentPage={currentPage}
        searchQuery={searchQuery}
        onPageChange={setCurrentPage}
        currentUserId={currentUserId}
        roleFilter={roleFilter}
      />
    </div>
  );
}
