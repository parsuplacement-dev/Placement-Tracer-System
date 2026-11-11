"use client";

import type { ReactNode } from "react";

import ErrorState from "@/components/ui/ErrorState";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableContentStateProps {
  colSpan: number;
  loadingMessage?: string;
  error?: string | null;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function TableContentState({
  colSpan,
  loadingMessage,
  error,
  retryLabel,
  onRetry,
  children,
}: TableContentStateProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-72 p-0">
        <div className="flex min-h-64 items-center justify-center text-center">
          {error ? (
            <ErrorState
              message={error}
              retryLabel={retryLabel}
              onRetry={onRetry}
            />
          ) : loadingMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-muted-foreground"
            >
              {loadingMessage}
            </div>
          ) : (
            children
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
