"use client";

import { Input } from "@/components/ui/input";

import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";

import { useCallback, useState } from "react";
import { LuLock, LuPlay, LuPlus, LuTrash2 } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

import { SelectField } from "@/components/forms/SelectField";
import { fieldStyles as styles } from "@/components/forms/graduate-tracer/shared";
import FormModal from "@/components/ui/FormModal";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { useToast } from "@/components/ui/Toast";
import { PublishedFormVersion, StudyPeriodSummary } from "@/types";
import ExportButton from "@/components/admin/ExportButton";
import Modal, { ModalActions, ModalNotice } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/checkbox";
import { createConfirmationCode } from "@/lib/confirmation-code";

export interface StudiesPayload {
  studies: StudyPeriodSummary[];
  formVersions: PublishedFormVersion[];
}

interface ScheduleDraft {
  formVersionId: string;
  academicYear: string;
  title: string;
}

const emptyDraft: ScheduleDraft = {
  formVersionId: "",
  academicYear: "",
  title: "",
};

const currentYear = new Date().getFullYear();
const academicYearOptions = Array.from(
  { length: currentYear - 2000 },
  (_, index) => {
    const startYear = 2000 + index;
    const academicYear = `${startYear}-${startYear + 1}`;
    return { value: academicYear, label: academicYear };
  },
);

const statusStyles = {
  upcoming: "bg-warning/15 text-warning",
  open: "bg-success/15 text-success",
  closed: "bg-secondary text-foreground",
  archived: "bg-secondary text-secondary-foreground",
};

export default function StudyScheduler({
  initialData,
}: {
  initialData: StudiesPayload;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<StudiesPayload>(initialData);
  const [saving, setSaving] = useState(false);
  const [changingStudyId, setChangingStudyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    study: StudyPeriodSummary;
    status: "open" | "closed";
  } | null>(null);
  const [pendingDeleteStudy, setPendingDeleteStudy] =
    useState<StudyPeriodSummary | null>(null);
  const [deletingStudyId, setDeletingStudyId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [moveFilesToAdmin, setMoveFilesToAdmin] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(emptyDraft);
  const createFormDirty =
    draft.formVersionId !== (data.formVersions[0]?.id ?? "") ||
    draft.academicYear !== "" ||
    draft.title !== "";

  const loadStudies = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/studies", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setData(result.data);
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to load studies.",
        type: "error",
      });
    }
  }, [showToast]);

  function openCreateForm() {
    setDraft({
      ...emptyDraft,
      formVersionId: data.formVersions[0]?.id ?? "",
    });
    setShowForm(true);
  }

  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();

    if (!draft.formVersionId) {
      showToast({ message: "Select a published form.", type: "error" });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      showToast({
        message: "Study created in the closed state.",
        type: "success",
      });
      setShowForm(false);
      await loadStudies();
      router.refresh();
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to save study.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeStudyStatus(
    study: StudyPeriodSummary,
    status: "open" | "closed",
  ) {
    setChangingStudyId(study.id);
    try {
      const response = await fetch(`/api/admin/studies/${study.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setData((current) => ({
        ...current,
        studies: current.studies.map((currentStudy) =>
          currentStudy.id === study.id
            ? { ...currentStudy, status }
            : currentStudy,
        ),
      }));
      setPendingStatusChange(null);

      showToast({
        message: status === "open" ? "Study opened." : "Study closed.",
        type: "success",
      });
      await loadStudies();
      router.refresh();
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to change study status.",
        type: "error",
      });
    } finally {
      setChangingStudyId(null);
    }
  }

  async function deleteStudy(study: StudyPeriodSummary) {
    setDeletingStudyId(study.id);
    try {
      const response = await fetch(`/api/admin/studies/${study.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveFilesToAdmin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setData((current) => ({
        ...current,
        studies: current.studies.filter((item) => item.id !== study.id),
      }));
      setPendingDeleteStudy(null);
      setDeleteConfirmation("");
      setDeleteConfirmationCode("");
      setMoveFilesToAdmin(false);
      showToast({ message: "Study deleted.", type: "success" });
      router.refresh();
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to delete study.",
        type: "error",
      });
    } finally {
      setDeletingStudyId(null);
    }
  }

  function openDeleteStudy(study: StudyPeriodSummary) {
    setDeleteConfirmation("");
    setDeleteConfirmationCode(createConfirmationCode());
    setMoveFilesToAdmin(false);
    setPendingDeleteStudy(study);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 p-5 shadow-lg">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Tracer Studies
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
            Create studies, manually control access, and export responses.
          </p>
        </div>
        <Button type="button" variant="default" onClick={openCreateForm}>
          <LuPlus size={16} animated />
          Create Study
        </Button>
      </header>

      <FormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Create tracer study"
        description="Choose the form and academic year. New studies remain closed until you open them."
        width="lg"
        fitContent
        showCloseButton={false}
        shouldConfirmClose={createFormDirty}
        confirmationTitle="Discard study schedule changes?"
        confirmationDescription="Any unsaved changes to this study schedule will be lost."
      >
        {(requestClose) => (
          <form onSubmit={saveSchedule} className="grid gap-5 md:grid-cols-2">
            <SelectField
              id="formVersionId"
              label="Form version *"
              value={draft.formVersionId}
              onChange={(formVersionId) =>
                setDraft((current) => ({
                  ...current,
                  formVersionId,
                }))
              }
              options={data.formVersions.map((version) => ({
                value: version.id,
                label: `${version.title} — v${version.version}`,
              }))}
              placeholder="Select a published form"
              required
            />

            <SelectField
              id="academicYear"
              label="Academic year *"
              value={draft.academicYear}
              onChange={(academicYear) =>
                setDraft((current) => ({ ...current, academicYear }))
              }
              options={academicYearOptions}
              placeholder="Select an academic year"
              required
            />

            <label className="min-w-0 md:col-span-2">
              <span className={styles.label}>Study title</span>
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={styles.input(false, false)}
                required
              />
            </label>

            <ModalActions className="md:col-span-2">
              <Button type="button" variant="ghost" onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={saving}>
                {saving ? "Creating..." : "Create Study"}
              </Button>
            </ModalActions>
          </form>
        )}
      </FormModal>

      <ConfirmationDialog
        open={pendingStatusChange !== null}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={() => {
          if (pendingStatusChange) {
            void changeStudyStatus(
              pendingStatusChange.study,
              pendingStatusChange.status,
            );
          }
        }}
        title={
          pendingStatusChange?.status === "open"
            ? pendingStatusChange.study.responseCount > 0
              ? "Reopen tracer study?"
              : "Open tracer study?"
            : "Close tracer study?"
        }
        description={
          pendingStatusChange?.status === "open"
            ? `This will allow responses to be created and changed for ${pendingStatusChange.study.academicYear} — ${pendingStatusChange.study.title}.`
            : pendingStatusChange
              ? `This will prevent new alumni responses and final manual submissions for ${pendingStatusChange.study.academicYear} — ${pendingStatusChange.study.title}.`
              : ""
        }
        confirmLabel={
          pendingStatusChange?.status === "open"
            ? pendingStatusChange.study.responseCount > 0
              ? "Reopen Study"
              : "Open Study"
            : "Close Study"
        }
        busy={changingStudyId !== null}
        tone={pendingStatusChange?.status === "closed" ? "danger" : "primary"}
        showCloseButton={false}
      />

      <Modal
        open={pendingDeleteStudy !== null}
        onClose={() => {
          if (deletingStudyId) return;
          setPendingDeleteStudy(null);
          setDeleteConfirmation("");
          setDeleteConfirmationCode("");
          setMoveFilesToAdmin(false);
        }}
        title="Permanently delete study?"
        description={
          pendingDeleteStudy
            ? `${pendingDeleteStudy.academicYear} — ${pendingDeleteStudy.title}`
            : undefined
        }
        width="md"
        fitContent
        showCloseButton={!deletingStudyId}
      >
        {pendingDeleteStudy && (
          <div className="space-y-5">
            <ModalNotice title="This action cannot be undone" tone="danger">
              <p>
                The study and all associated responses will be permanently
                deleted. Download a backup first if these records may be needed
                later.
              </p>
            </ModalNotice>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Download response backup
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <a
                  className={buttonVariants({ variant: "success" })}
                  href={`/api/admin/responses/export?study=${encodeURIComponent(pendingDeleteStudy.id)}&format=xlsx`}
                >
                  Export to Excel
                </a>
                <a
                  className={buttonVariants({ variant: "success" })}
                  href={`/api/admin/responses/export?study=${encodeURIComponent(pendingDeleteStudy.id)}&format=csv`}
                >
                  Export to CSV
                </a>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <Checkbox
                className="mt-1"
                checked={moveFilesToAdmin}
                disabled={deletingStudyId !== null}
                onCheckedChange={setMoveFilesToAdmin}
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Move the study folder to Admin Files
                </span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  Preserve the study&apos;s Google Drive files under Admin Files
                  instead of deleting them.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Type the confirmation phrase below to continue
              </span>
              <span className="mt-2 block select-none rounded-xl border border-border bg-muted px-4 py-3 text-center font-mono text-base font-semibold tracking-widest text-foreground">
                DELETE {deleteConfirmationCode}
              </span>
              <Input
                className="mt-2"
                value={deleteConfirmation}
                disabled={deletingStudyId !== null}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
            </label>

            <ModalActions>
              <Button
                type="button"
                variant="outline"
                disabled={deletingStudyId !== null}
                onClick={() => {
                  setPendingDeleteStudy(null);
                  setDeleteConfirmation("");
                  setDeleteConfirmationCode("");
                  setMoveFilesToAdmin(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  deletingStudyId !== null ||
                  deleteConfirmation !== `DELETE ${deleteConfirmationCode}`
                }
                onClick={() => void deleteStudy(pendingDeleteStudy)}
              >
                {deletingStudyId ? "Deleting study..." : "Delete Study"}
              </Button>
            </ModalActions>
          </div>
        )}
      </Modal>

      {data.studies.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-input bg-card p-10 text-center text-muted-foreground">
          No study periods have been scheduled yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.studies.map((study) => (
            <article
              key={study.id}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AY {study.academicYear}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {study.title}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[study.status]}`}
                >
                  {study.status}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Responses</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {study.responseCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {study.submittedResponseCount}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <ExportButton
                  baseUrl={`/api/admin/responses/export?study=${encodeURIComponent(study.id)}`}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  disabled={
                    changingStudyId !== null || deletingStudyId !== null
                  }
                  onClick={() => openDeleteStudy(study)}
                  aria-label="Delete study"
                  title="Delete study"
                >
                  <LuTrash2 animated />
                </Button>
                {study.status === "closed" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={changingStudyId !== null}
                    onClick={() =>
                      setPendingStatusChange({ study, status: "open" })
                    }
                  >
                    <LuPlay animated />
                    {study.responseCount > 0 ? "Reopen" : "Open"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={changingStudyId !== null}
                    onClick={() =>
                      setPendingStatusChange({ study, status: "closed" })
                    }
                  >
                    <LuLock /> Close
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
