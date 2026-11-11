import { after, NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/auth";
import { validateGraduateTracerSurvey } from "@/lib/forms/graduate-tracer-validation";
import { organizeResponseDriveFolder } from "@/lib/google-drive/organize-response";
import { deleteResponseDriveData } from "@/lib/google-drive/response-cleanup";
import {
  claimFormResponseDeletion,
  deleteFormResponse,
  getFormResponse,
  getFormResponseForUserDeletion,
  markFormResponseDeletionFailed,
  saveFormResponse,
  StaleFormResponseError,
} from "@/lib/repositories/form-responses.repository";
import { getStudyContext } from "@/lib/repositories/forms.repository";
import { recordUserAuditEventSafely } from "@/lib/repositories/audit.repository";
import { FormResponseStatus, ROLES } from "@/types";

interface SaveResponseBody {
  answers?: unknown;
  status?: unknown;
  expectedUpdatedAt?: unknown;
}

function isAnswersObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResponseStatus(value: unknown): value is FormResponseStatus {
  return value === "draft" || value === "submitted";
}

function getUnknownAnswerKeys(
  answers: Record<string, unknown>,
  allowedKeys: string[],
) {
  const allowed = new Set(allowedKeys);

  return Object.keys(answers).filter((key) => !allowed.has(key));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  try {
    const { user } = await requireUser();
    requireRole(user, [ROLES.ALUMNI]);

    const { studyId } = await params;
    const context = await getStudyContext(studyId);

    if (!context) {
      return NextResponse.json(
        { success: false, message: "Study period not found." },
        { status: 404 },
      );
    }

    const response = await getFormResponse(studyId, user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...context,
        response,
        readOnly: context.study.status !== "open",
      },
    });
  } catch (error) {
    console.error("Failed to load study response:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load the study response." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};
  let activeStep = "authentication";
  let failed = false;
  async function measure<T>(step: string, operation: () => Promise<T>) {
    activeStep = step;
    const stepStartedAt = performance.now();
    try {
      return await operation();
    } finally {
      timings[step] = Math.round(performance.now() - stepStartedAt);
    }
  }

  try {
    const { user } = await measure("authentication", () => requireUser());
    requireRole(user, [ROLES.ALUMNI]);

    const { studyId } = await params;
    const context = await measure("study", () => getStudyContext(studyId));

    if (!context) {
      return NextResponse.json(
        { success: false, message: "Study period not found." },
        { status: 404 },
      );
    }

    if (context.study.status !== "open") {
      return NextResponse.json(
        {
          success: false,
          message: "This study is closed and responses are read-only.",
        },
        { status: 423 },
      );
    }

    activeStep = "validation";
    const body = (await request.json()) as SaveResponseBody;

    if (!isAnswersObject(body.answers) || !isResponseStatus(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid answers object and response status are required.",
        },
        { status: 400 },
      );
    }

    if (
      body.expectedUpdatedAt !== undefined &&
      typeof body.expectedUpdatedAt !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "The response version is invalid." },
        { status: 400 },
      );
    }

    const allowedKeys = context.definition.sections.flatMap(
      (section) => section.fieldKeys,
    );
    const unknownKeys = getUnknownAnswerKeys(body.answers, allowedKeys);

    if (unknownKeys.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The response contains fields outside this form version.",
          errors: {
            unknownKeys,
          },
        },
        { status: 400 },
      );
    }

    if (body.status === "submitted") {
      const validation = validateGraduateTracerSurvey(body.answers);

      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: "Please complete all required response fields.",
            errors: validation.errors,
          },
          { status: 400 },
        );
      }
    }

    const saveInput = {
      studyPeriodId: studyId,
      userId: user.id,
      status: body.status,
      answers: body.answers,
      expectedUpdatedAt: body.expectedUpdatedAt,
    };
    const { response, shouldOrganize } = await measure("save", () =>
      saveFormResponse(saveInput),
    );

    await measure("audit", () =>
      recordUserAuditEventSafely(user, {
        action: "response.saved",
        targetType: "form_response",
        targetId: response.id,
        metadata: { studyPeriodId: studyId, status: response.status },
      }),
    );

    activeStep = "finalize";
    if (shouldOrganize) {
      after(async () => {
        try {
          await organizeResponseDriveFolder(response);
        } catch (error) {
          console.error("Failed to organize the new tracer response:", error);
        }
      });
    }

    const result = NextResponse.json({
      success: true,
      data: response,
    });
    result.headers.set(
      "Server-Timing",
      Object.entries(timings)
        .map(([step, duration]) => `${step};dur=${duration}`)
        .join(", "),
    );
    return result;
  } catch (error) {
    failed = true;
    if (error instanceof StaleFormResponseError) {
      return NextResponse.json(
        {
          success: false,
          code: "STALE_RESPONSE",
          message:
            "This response was updated in another tab. Refresh it before saving again.",
        },
        { status: 409 },
      );
    }
    console.error("Failed to save study response:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save the study response." },
      { status: 500 },
    );
  } finally {
    const totalMs = Math.round(performance.now() - startedAt);
    if (failed || totalMs >= 1_000) {
      console.info("Study response save timing:", {
        totalMs,
        stepsMs: timings,
        failedStep: failed ? activeStep : undefined,
      });
    }
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> },
) {
  try {
    const { user } = await requireUser();
    requireRole(user, [ROLES.ALUMNI]);

    const { studyId } = await params;
    const context = await getStudyContext(studyId);

    if (!context) {
      return NextResponse.json(
        { success: false, message: "Study period not found." },
        { status: 404 },
      );
    }

    if (context.study.status !== "open") {
      return NextResponse.json(
        {
          success: false,
          message: "Closed study responses cannot be deleted.",
        },
        { status: 423 },
      );
    }

    const existingResponse = await getFormResponseForUserDeletion(
      studyId,
      user.id,
    );

    if (!existingResponse) {
      return NextResponse.json({ success: true });
    }

    let claimedResponse =
      existingResponse.deletionStatus === "deleting"
        ? existingResponse
        : await claimFormResponseDeletion(existingResponse.id);

    for (let attempt = 0; !claimedResponse && attempt < 20; attempt += 1) {
      const activeResponse = await getFormResponse(studyId, user.id);
      if (
        !activeResponse ||
        activeResponse.driveOrganizationStatus !== "organizing"
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      claimedResponse = await claimFormResponseDeletion(existingResponse.id);
    }
    if (!claimedResponse) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This response is still being prepared. Please try deleting it again.",
        },
        { status: 409 },
      );
    }

    try {
      await deleteResponseDriveData(claimedResponse.id);
      await deleteFormResponse(claimedResponse.id);
    } catch (error) {
      await markFormResponseDeletionFailed(claimedResponse.id).catch(
        () => undefined,
      );
      throw error;
    }

    await recordUserAuditEventSafely(user, {
      action: "response.deleted",
      targetType: "form_response",
      targetId: claimedResponse.id,
      metadata: { studyPeriodId: studyId, source: claimedResponse.source },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete study response:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The response could not be fully deleted. It was retained for a safe retry.",
      },
      { status: 502 },
    );
  }
}
