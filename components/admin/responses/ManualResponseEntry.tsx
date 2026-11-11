"use client";

import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { SelectField } from "@/components/forms/SelectField";
import GraduateTracerForm, {
  PendingSurveyDocuments,
} from "@/components/forms/GraduateTracerForm";
import { surveyToAnswers } from "@/lib/forms/graduate-tracer-adapter";
import { defaultSurvey } from "@/lib/surveys/defaults";
import { uploadFormResponseDocument } from "@/lib/api/form-response-documents";
import { readApiJson } from "@/lib/api/client-errors";
import {
  StudyPeriod,
  Survey,
  SurveyDocument,
  SurveyDocumentType,
} from "@/types";

export interface ManualResponseDraft {
  responseId: string;
  studyId: string;
  respondentEmail: string;
  importToken: string;
  updatedAt: string;
  response: Survey;
}

export interface ManualResponseEntryHandle {
  saveDraft: () => Promise<{ id: string; updatedAt?: string }>;
  discardDraft: () => Promise<void>;
}

interface ManualResponseEntryProps {
  studies: StudyPeriod[];
  initialDraft?: ManualResponseDraft | null;
  onComplete?: () => void;
  onDraftSaved?: (responseId: string) => void;
  onRequestClose?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  allowedProgramValues?: string[] | null;
}

const ManualResponseEntry = forwardRef<
  ManualResponseEntryHandle,
  ManualResponseEntryProps
>(function ManualResponseEntry(
  {
    studies,
    initialDraft,
    onComplete,
    onDraftSaved,
    onRequestClose,
    onDirtyChange,
    allowedProgramValues,
  },
  ref,
) {
  const router = useRouter();
  const [studyId, setStudyId] = useState(
    initialDraft?.studyId ??
      studies.find((study) => study.status === "open")?.id ??
      "",
  );
  const [respondentEmail, setRespondentEmail] = useState(
    initialDraft?.respondentEmail ?? "",
  );
  const [responseDirty, setResponseDirty] = useState(false);
  const latestResponseRef = useRef<Survey>(
    structuredClone(initialDraft?.response ?? defaultSurvey),
  );
  const responseIdRef = useRef<string | null>(initialDraft?.responseId ?? null);
  const importTokenRef = useRef<string>(
    initialDraft?.importToken ?? crypto.randomUUID(),
  );
  const uploadKeysRef = useRef(new WeakMap<File, string>());
  const lastPersistedSignatureRef = useRef<string | null>(
    initialDraft
      ? JSON.stringify({
          studyId: initialDraft.studyId,
          respondentEmail: initialDraft.respondentEmail,
          response: initialDraft.response,
        })
      : null,
  );
  const pendingPersistRef = useRef<{
    signature: string;
    promise: Promise<{ id: string; updatedAt?: string }>;
  } | null>(null);
  const initialMetadataRef = useRef({
    studyId:
      initialDraft?.studyId ??
      studies.find((study) => study.status === "open")?.id ??
      "",
    respondentEmail: initialDraft?.respondentEmail ?? "",
  });

  const metadataDirty =
    studyId !== initialMetadataRef.current.studyId ||
    respondentEmail !== initialMetadataRef.current.respondentEmail;

  useEffect(() => {
    onDirtyChange?.(metadataDirty || responseDirty);
  }, [metadataDirty, onDirtyChange, responseDirty]);

  function getUploadKey(file: File) {
    const existingKey = uploadKeysRef.current.get(file);
    if (existingKey) return existingKey;

    const uploadKey = crypto.randomUUID();
    uploadKeysRef.current.set(file, uploadKey);
    return uploadKey;
  }

  async function persistManualResponse(
    response: Survey,
    mode: "draft" | "submitted",
  ) {
    if (!studyId) {
      throw new Error("Select an open study before saving the response.");
    }

    const signature = JSON.stringify({ studyId, respondentEmail, response });
    if (
      mode === "draft" &&
      pendingPersistRef.current?.signature === signature
    ) {
      return pendingPersistRef.current.promise;
    }

    const respondentName = [
      response.firstName,
      response.middleName,
      response.lastName,
      response.extensionName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const persist = (async () => {
      const saveResponse = await fetch(
        `/api/admin/studies/${studyId}/responses/manual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            respondentName,
            respondentEmail,
            answers: surveyToAnswers(response),
            importToken: importTokenRef.current,
            mode,
          }),
        },
      );
      const result = await readApiJson<{
        data?: { id?: string; importToken?: string; updatedAt?: string };
      }>(saveResponse, "The manual response draft could not be saved.");

      if (typeof result.data?.id !== "string") {
        throw new Error("The manual response draft could not be saved.");
      }

      responseIdRef.current = result.data.id;
      if (typeof result.data.importToken === "string") {
        importTokenRef.current = result.data.importToken;
      }
      latestResponseRef.current = structuredClone(response);
      lastPersistedSignatureRef.current = signature;
      initialMetadataRef.current = { studyId, respondentEmail };
      if (mode === "draft") onDraftSaved?.(result.data.id);
      return result.data as { id: string; updatedAt?: string };
    })();

    if (mode === "draft") {
      pendingPersistRef.current = { signature, promise: persist };
    }

    try {
      return await persist;
    } finally {
      if (pendingPersistRef.current?.promise === persist) {
        pendingPersistRef.current = null;
      }
    }
  }

  async function uploadManualDocument(
    response: Survey,
    file: File,
    documentType: SurveyDocumentType,
    onProgress: (percentage: number) => void = () => undefined,
  ) {
    const saved = await persistManualResponse(response, "draft");
    return uploadFormResponseDocument(saved.id, file, documentType, {
      onProgress,
      uploadKey: getUploadKey(file),
    });
  }

  async function deleteManualDocument(document: SurveyDocument) {
    const responseId = responseIdRef.current;
    if (!responseId) throw new Error("The draft has not been saved yet.");

    const deleteResponse = await fetch(
      `/api/form-responses/${responseId}/documents/${document.id}`,
      { method: "DELETE" },
    );
    const result = await deleteResponse.json();
    if (!deleteResponse.ok) {
      throw new Error(result.message ?? "Failed to delete the document.");
    }
  }

  async function saveManualResponse(
    response: Survey,
    documents: PendingSurveyDocuments,
  ) {
    const saved = await persistManualResponse(response, "submitted");
    const uploadKeys = new Set(
      response.documents.flatMap((document) =>
        document.uploadKey ? [document.uploadKey] : [],
      ),
    );

    try {
      for (const [documentType, files] of [
        ["employment", documents.employment],
        ["awards", documents.awards],
      ] as const) {
        for (const file of files) {
          const document = await uploadFormResponseDocument(
            saved.id,
            file,
            documentType,
            { uploadKey: getUploadKey(file) },
          );
          if (document.uploadKey) uploadKeys.add(document.uploadKey);
        }
      }

      const completionResponse = await fetch(
        `/api/admin/responses/${saved.id}/import`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            uploadKeys: [...uploadKeys],
          }),
        },
      );
      const completionResult = await completionResponse.json();

      if (!completionResponse.ok) {
        throw new Error(
          completionResult.message ?? "Failed to complete the manual response.",
        );
      }

      responseIdRef.current = null;
      importTokenRef.current = crypto.randomUUID();
      uploadKeysRef.current = new WeakMap<File, string>();
    } catch (error) {
      await persistManualResponse(response, "draft").catch(() => undefined);
      throw error;
    }
  }

  useImperativeHandle(ref, () => ({
    async saveDraft() {
      const signature = JSON.stringify({
        studyId,
        respondentEmail,
        response: latestResponseRef.current,
      });
      if (signature === lastPersistedSignatureRef.current) {
        const id = responseIdRef.current;
        if (!id) throw new Error("The draft has not been saved yet.");
        return { id };
      }

      return persistManualResponse(latestResponseRef.current, "draft");
    },
    async discardDraft() {
      const responseId = responseIdRef.current;
      if (!responseId) return;

      const deleteResponse = await fetch(`/api/admin/responses/${responseId}`, {
        method: "DELETE",
      });
      const result = await deleteResponse.json();
      if (!deleteResponse.ok) {
        throw new Error(
          result.message ?? "Failed to discard the manual draft.",
        );
      }

      responseIdRef.current = null;
      importTokenRef.current = crypto.randomUUID();
      latestResponseRef.current = structuredClone(defaultSurvey);
      uploadKeysRef.current = new WeakMap<File, string>();
    },
  }));

  if (!studies.some((study) => study.status === "open")) {
    return (
      <div className="rounded-3xl border border-warning/30 bg-warning/10 p-6 text-sm text-warning">
        Open a Graduate Tracer v1 study before importing historical responses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-border bg-card md:border md:p-6 md:shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Import details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record where this historical response belongs.
        </p>
        <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm text-foreground">
          All response fields and supporting document uploads are optional for
          manual imports. Required markers only reflect the original alumni
          response form.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <SelectField
            id="studyId"
            label="Study period *"
            value={studyId}
            onChange={setStudyId}
            options={studies.map((study) => ({
              value: study.id,
              label: `${study.academicYear} — ${study.title} (${study.status})`,
              disabled: study.status !== "open",
            }))}
            required
          />

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Respondent email
            </span>
            <Input
              type="email"
              value={respondentEmail}
              onChange={(event) => setRespondentEmail(event.target.value)}
              placeholder="Optional"
              className="w-full"
            />
          </label>
        </div>
      </section>

      <GraduateTracerForm
        initialData={structuredClone(initialDraft?.response ?? defaultSurvey)}
        isNew={!initialDraft}
        requireResponses={false}
        submitLabel="Add Manual Response"
        initialSavedAt={initialDraft?.updatedAt}
        onValuesChange={(response) => {
          latestResponseRef.current = structuredClone(response);
        }}
        onDirtyChange={setResponseDirty}
        onDraftSave={async (response) => {
          const saved = await persistManualResponse(response, "draft");
          return saved.updatedAt;
        }}
        onInstantDocumentUpload={uploadManualDocument}
        onDeleteDocument={deleteManualDocument}
        onRequestClose={onRequestClose}
        onSave={saveManualResponse}
        onSuccess={() => {
          if (onComplete) onComplete();
          else router.push("/admin/responses");
        }}
        allowedProgramValues={allowedProgramValues}
      />
    </div>
  );
});

export default ManualResponseEntry;
