"use client";

import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { AdminResponseFilters, AdminResponseSummary, Survey } from "@/types";
import ManualResponseEditor from "@/components/admin/responses/ManualResponseEditor";
import ReadOnlyResponseDetails, {
  TracerResponseModalHeader,
} from "@/components/responses/ReadOnlyResponseDetails";
import { LuEye, LuPencil, LuRefreshCw, LuTrash2 } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import LoadingState from "@/components/ui/LoadingState";
import { friendlyRequestMessage } from "@/lib/api/client-errors";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { PROGRAMS } from "@/lib/programs/catalog";
import {
  SortableTableHead,
  type SortDirection,
} from "@/components/ui/sortable-table-head";
import { TableContentState } from "@/components/ui/table-content-state";
import { CopyButton } from "@/components/ui/copy-button";

type ResponseSortKey =
  | "name"
  | "academicYear"
  | "program"
  | "employmentStatus"
  | "createdAt"
  | "driveStatus";

const employmentStatusLabels: Record<string, string> = {
  Yes: "Currently Employed",
  No: "Not Employed",
  "Never Employed": "Never Employed",
};

const employmentStatusStyles: Record<string, string> = {
  Yes: "border-success/20 bg-success/10 text-success",
  No: "border-warning/30 bg-warning/15 text-warning",
  "Never Employed": "border-border bg-muted text-muted-foreground",
};

interface ServerDataResponse {
  success: boolean;
  responses: AdminResponseSummary[];
  total: number;
  message?: string;
}

interface ResponseTableProps {
  currentPage: number;
  filters: AdminResponseFilters;
  onPageChange: (newPage: number) => void;
}

export default function ResponseTable({
  currentPage,
  filters,
  onPageChange,
}: ResponseTableProps) {
  const [responses, setResponses] = useState<AdminResponseSummary[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [surveyData, setSurveyData] = useState<Survey | null>(null);
  const [responseMetadata, setResponseMetadata] = useState<{
    source: "alumni" | "admin_import";
    respondentEmail: string;
    studyStatus: "open" | "closed";
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortKey, setSortKey] = useState<ResponseSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [organizingResponseId, setOrganizingResponseId] = useState<
    string | null
  >(null);

  const { showToast } = useToast();
  const router = useRouter();

  const itemsPerPage = 10;

  useEffect(() => {
    if (!selectedSurveyId) return;

    async function fetchSurvey() {
      try {
        setLoadingSurvey(true);

        try {
          const res = await fetch(`/api/admin/responses/${selectedSurveyId}`, {
            credentials: "include",
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message ?? "Failed to load response.");
          }

          setSurveyData(data.response);
          setResponseMetadata(data.metadata);
        } catch (error: unknown) {
          showToast({
            message:
              error instanceof Error
                ? error.message
                : "Failed to load response.",
            type: "error",
          });

          setSelectedSurveyId(null);
          setSurveyData(null);
          setResponseMetadata(null);
        } finally {
          setLoadingSurvey(false);
        }
      } finally {
        setLoadingSurvey(false);
      }
    }

    fetchSurvey();
  }, [selectedSurveyId, showToast]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSurveys() {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage),
          sort: sortKey,
          direction: sortDirection,
        });

        if (filters.search) searchParams.set("search", filters.search);
        if (filters.studyPeriodId) {
          searchParams.set("study", filters.studyPeriodId);
        }
        if (filters.program) searchParams.set("program", filters.program);
        if (filters.source) searchParams.set("source", filters.source);
        if (filters.status) searchParams.set("status", filters.status);
        if (filters.employmentStatus) {
          searchParams.set("employmentStatus", filters.employmentStatus);
        }

        const res = await fetch(
          `/api/admin/responses?${searchParams.toString()}`,
          {
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          },
        );

        const data: ServerDataResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.message ?? "Failed to load responses.");
        }

        setResponses(data.responses);
        setTotalRows(data.total);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        setError(
          friendlyRequestMessage(
            error,
            "An error occurred on our end and we couldn’t retrieve the responses.",
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSurveys();

    return () => {
      controller.abort();
    };
  }, [currentPage, filters, reloadKey, sortDirection, sortKey]);

  const handleSort = (key: ResponseSortKey) => {
    setSortDirection((current) =>
      sortKey === key ? (current === "asc" ? "desc" : "asc") : "asc",
    );
    setSortKey(key);
    onPageChange(1);
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/responses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? "Failed to delete response.");
      }

      setResponses((previous) =>
        previous.filter((response) => response.id !== id),
      );
      setTotalRows((prev) => Math.max(0, prev - 1));

      setSurveyToDelete(null);
      setShowDeleteModal(false);

      showToast({
        message: "Response deleted successfully.",
        type: "success",
      });

      router.refresh();
    } catch (error: unknown) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to delete response.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const retryDriveOrganization = async (id: string) => {
    setOrganizingResponseId(id);

    try {
      const response = await fetch(`/api/admin/responses/${id}/organize`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to organize Drive folder.");
      }

      setResponses((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                driveOrganizationStatus: "organized",
                driveOrganizationError: null,
              }
            : item,
        ),
      );
      showToast({ message: "Response folder organized.", type: "success" });
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to organize Drive folder.",
        type: "error",
      });
    } finally {
      setOrganizingResponseId(null);
    }
  };

  const totalPages = Math.ceil(totalRows / itemsPerPage) || 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const formatFullName = (response: AdminResponseSummary) => {
    const surname = response.lastName?.trim();
    const givenNames = [
      response.firstName,
      response.middleName,
      response.extensionName,
    ]
      .map((p) => p?.trim())
      .filter(Boolean);

    if (surname && givenNames.length > 0) {
      return `${surname}, ${givenNames.join(" ")}`;
    }

    if (surname) return surname;
    if (givenNames.length > 0) return givenNames.join(" ");
    return response.respondentName?.trim() || "Unnamed Respondent";
  };

  const programLabels = new Map(
    PROGRAMS.map((program) => [program.value, program.label]),
  );

  const openResponse = (response: AdminResponseSummary) => {
    setSelectedSurveyId(response.id);
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "button,a,input,select,textarea,[role='menuitem'],[data-row-action]",
      ),
    );

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <Table
        className={`${loading || totalRows === 0 ? "" : "min-w-280 "}table-auto`}
        containerClassName={
          loading || totalRows === 0 ? "overflow-x-hidden" : undefined
        }
      >
        {!loading && totalRows > 0 && (
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHead
                direction={sortKey === "name" ? sortDirection : undefined}
                onSort={() => handleSort("name")}
              >
                Full Name
              </SortableTableHead>
              <SortableTableHead
                direction={
                  sortKey === "academicYear" ? sortDirection : undefined
                }
                onSort={() => handleSort("academicYear")}
              >
                Academic Year
              </SortableTableHead>
              <SortableTableHead
                direction={sortKey === "program" ? sortDirection : undefined}
                onSort={() => handleSort("program")}
              >
                Program
              </SortableTableHead>
              <SortableTableHead
                direction={
                  sortKey === "employmentStatus" ? sortDirection : undefined
                }
                onSort={() => handleSort("employmentStatus")}
              >
                Employment Status
              </SortableTableHead>
              <SortableTableHead
                direction={sortKey === "createdAt" ? sortDirection : undefined}
                onSort={() => handleSort("createdAt")}
              >
                Created
              </SortableTableHead>
              <SortableTableHead
                direction={
                  sortKey === "driveStatus" ? sortDirection : undefined
                }
                onSort={() => handleSort("driveStatus")}
              >
                Drive
              </SortableTableHead>
              <TableHead className="text-center">Menu</TableHead>
            </TableRow>
          </TableHeader>
        )}
        <TableBody aria-busy={loading}>
          {loading ? (
            <TableContentState
              colSpan={7}
              loadingMessage="Loading responses..."
            />
          ) : error ? (
            <TableContentState
              colSpan={7}
              error={error}
              retryLabel="Refresh responses"
              onRetry={() => setReloadKey((current) => current + 1)}
            />
          ) : totalRows === 0 ? (
            <TableContentState colSpan={7}>
              <div className="text-center text-muted-foreground">
                {Object.values(filters).some(Boolean) ? (
                  <>
                    <h3 className="font-semibold">
                      No matching responses found
                    </h3>
                    <p className="mt-2 text-sm">
                      Try adjusting your filters to view response records.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold">No response records yet</h3>
                    <p className="mt-2 text-sm">
                      Responses will appear after alumni complete the tracer
                      form.
                    </p>
                  </>
                )}
              </div>
            </TableContentState>
          ) : (
            responses.map((response) => (
              <TableRow
                key={response.id}
                tabIndex={0}
                aria-label={`${response.source === "admin_import" ? "Edit" : "View"} response from ${formatFullName(response)}`}
                onPointerUp={(event) => {
                  if (
                    event.pointerType === "mouse" ||
                    isInteractiveTarget(event.target)
                  ) {
                    return;
                  }
                  openResponse(response);
                }}
                onDoubleClick={(event) => {
                  if (isInteractiveTarget(event.target)) return;
                  openResponse(response);
                }}
                onKeyDown={(event) => {
                  if (
                    (event.key !== "Enter" && event.key !== " ") ||
                    isInteractiveTarget(event.target)
                  ) {
                    return;
                  }
                  event.preventDefault();
                  openResponse(response);
                }}
                className="group cursor-pointer select-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_*]:[-webkit-tap-highlight-color:transparent]"
              >
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-1.5">
                    <span>{formatFullName(response)}</span>
                    <CopyButton
                      value={formatFullName(response)}
                      label={`Copy ${formatFullName(response)}`}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium text-muted-foreground">
                  {response.academicYear}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span
                    tabIndex={0}
                    aria-label={
                      programLabels.get(response.program) ||
                      response.program ||
                      "Unspecified program"
                    }
                    title={
                      programLabels.get(response.program) ||
                      response.program ||
                      "Unspecified program"
                    }
                    className="inline-flex rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {response.program?.toUpperCase() || "UNSPECIFIED"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span
                    aria-label={
                      employmentStatusLabels[response.employmentStatus] ||
                      "Unspecified employment status"
                    }
                    className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${
                      employmentStatusStyles[response.employmentStatus] ||
                      "border-border bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {(
                      employmentStatusLabels[response.employmentStatus] ||
                      "Unspecified"
                    ).toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {response.createdAt
                    ? new Date(response.createdAt).toLocaleDateString()
                    : "N/A"}
                </TableCell>

                <TableCell>
                  <span
                    title={response.driveOrganizationError ?? undefined}
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      response.driveOrganizationStatus === "organized"
                        ? "bg-success/15 text-success"
                        : response.driveOrganizationStatus === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/15 text-warning"
                    }`}
                  >
                    {response.driveOrganizationStatus}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex justify-center">
                    <TableActionMenu
                      label={`Actions for ${formatFullName(response)}`}
                      items={[
                        ...(response.driveOrganizationStatus !== "organized"
                          ? [
                              {
                                label: "Retry Drive Organization",
                                variant: "secondary" as const,
                                disabled: organizingResponseId !== null,
                                icon: (
                                  <LuRefreshCw
                                    aria-hidden="true"
                                    size={16}
                                    animated={
                                      organizingResponseId !== response.id
                                    }
                                    className={
                                      organizingResponseId === response.id
                                        ? "animate-spin"
                                        : undefined
                                    }
                                  />
                                ),
                                onSelect: () =>
                                  void retryDriveOrganization(response.id),
                              },
                            ]
                          : []),
                        {
                          label:
                            response.source === "admin_import"
                              ? "Edit Response"
                              : "View Response",
                          icon:
                            response.source === "admin_import" ? (
                              <LuPencil aria-hidden="true" size={16} animated />
                            ) : (
                              <LuEye aria-hidden="true" size={16} animated />
                            ),
                          onSelect: () => setSelectedSurveyId(response.id),
                        },
                        ...(response.studyStatus === "open"
                          ? [
                              {
                                label: "Delete Response",
                                variant: "destructive" as const,
                                disabled: isDeleting,
                                icon: (
                                  <LuTrash2
                                    aria-hidden="true"
                                    size={16}
                                    animated
                                  />
                                ),
                                onSelect: () => {
                                  setSurveyToDelete(response.id);
                                  setShowDeleteModal(true);
                                },
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
        open={Boolean(selectedSurveyId)}
        onClose={() => {
          setSelectedSurveyId(null);
          setSurveyData(null);
          setResponseMetadata(null);
        }}
        title={
          responseMetadata?.source === "admin_import"
            ? "Edit Manual Response"
            : "View Tracer Response"
        }
        headerContent={
          surveyData && responseMetadata?.source !== "admin_import" ? (
            <TracerResponseModalHeader response={surveyData} />
          ) : undefined
        }
        headerVariant={
          surveyData && responseMetadata?.source !== "admin_import"
            ? "accent"
            : "default"
        }
        width="xl"
      >
        {loadingSurvey ? (
          <LoadingState className="min-h-72" message="Loading response..." />
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            {surveyData &&
            responseMetadata?.source === "admin_import" &&
            selectedSurveyId ? (
              <ManualResponseEditor
                responseId={selectedSurveyId}
                initialData={surveyData}
                initialRespondentEmail={responseMetadata.respondentEmail}
                onComplete={() => {
                  setSelectedSurveyId(null);
                  setSurveyData(null);
                  setResponseMetadata(null);
                  setReloadKey((current) => current + 1);
                }}
              />
            ) : surveyData ? (
              <ReadOnlyResponseDetails
                response={surveyData}
                respondentEmail={responseMetadata?.respondentEmail}
              />
            ) : null}
          </div>
        )}
      </Modal>

      {totalRows > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 p-4 text-sm sm:px-6">
          {totalRows > 1 ? (
            <span className="rounded-lg bg-muted/60 px-4 py-2 font-semibold whitespace-nowrap text-muted-foreground">
              Showing <span>{responses.length}</span> of{" "}
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
              disabled={loading || !hasPrevPage}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={loading || !hasNextPage}
              variant="default"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSurveyToDelete(null);
        }}
        onConfirm={() => {
          if (surveyToDelete) void confirmDelete(surveyToDelete);
        }}
        title="Delete response?"
        description="This response and its document records will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Response"
        busy={isDeleting}
        tone="danger"
      />
    </div>
  );
}
