import { after, NextRequest, NextResponse } from "next/server";

import {
  getAllowedProgramValues,
  requireAdmin,
  requireStaff,
} from "@/lib/auth";
import { initializeStudyDriveHierarchy } from "@/lib/google-drive/initialize-hierarchy";
import { syncGoogleDriveIndex } from "@/lib/google-drive/sync-index";
import {
  createStudyPeriod,
  listPublishedFormVersions,
  listStudyPeriodSummaries,
} from "@/lib/repositories/study-admin.repository";
import { recordUserAuditEventSafely } from "@/lib/repositories/audit.repository";

const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidAcademicYear(value: string) {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);

  return !!match && Number(match[2]) === Number(match[1]) + 1;
}

export async function GET() {
  try {
    const staff = await requireStaff();

    const [studies, formVersions] = await Promise.all([
      listStudyPeriodSummaries(),
      listPublishedFormVersions(),
    ]);
    const allowedProgramValues = getAllowedProgramValues(staff);
    const visibleStudies = allowedProgramValues
      ? studies.map((study) => ({
          ...study,
          responseCount: 0,
          submittedResponseCount: 0,
        }))
      : studies;

    return NextResponse.json(
      {
        success: true,
        data: {
          studies: visibleStudies,
          formVersions,
          allowedProgramValues,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to list study periods:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load study periods." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;
    const formVersionId =
      typeof body.formVersionId === "string" ? body.formVersionId : "";
    const academicYear =
      typeof body.academicYear === "string" ? body.academicYear.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!formVersionId || !isValidAcademicYear(academicYear) || !title) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid form, academic year, and title.",
        },
        { status: 400 },
      );
    }

    const study = await createStudyPeriod({
      formVersionId,
      academicYear,
      title,
    });

    await recordUserAuditEventSafely(admin, {
      action: "study.created",
      targetType: "study_period",
      targetId: study.id,
      metadata: { academicYear, title },
    });

    after(async () => {
      try {
        await initializeStudyDriveHierarchy({
          studyId: study.id,
          academicYear,
        });
        await syncGoogleDriveIndex();
      } catch (error) {
        console.error("Failed to prepare folders for the new study:", error);
      }
    });

    return NextResponse.json({ success: true, data: study }, { status: 201 });
  } catch (error) {
    console.error("Failed to create study period:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create study period.",
      },
      { status: 500 },
    );
  }
}
