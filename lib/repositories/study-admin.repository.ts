import { supabase } from "@/lib/supabase/server";
import {
  PublishedFormVersion,
  StudyPeriodStatus,
  StudyPeriodSummary,
} from "@/types";

interface StudyRow {
  id: string;
  form_id: string;
  form_version_id: string;
  academic_year: string;
  title: string;
  opens_at: string;
  closes_at: string;
  archived_at: string | null;
  status: StudyPeriodStatus;
}

interface StudySummaryRow extends StudyRow {
  response_count: number | string;
  submitted_response_count: number | string;
}

interface FormVersionRow {
  id: string;
  form_id: string;
  version: number;
  form_definitions: {
    slug: string;
    title: string;
  };
}

export async function listPublishedFormVersions(): Promise<
  PublishedFormVersion[]
> {
  const { data, error } = await supabase
    .from("form_versions")
    .select("id, form_id, version, form_definitions!inner(slug, title)")
    .not("published_at", "is", null)
    .order("version", { ascending: false });

  if (error) throw error;

  return (data as unknown as FormVersionRow[]).map((row) => ({
    id: row.id,
    formId: row.form_id,
    slug: row.form_definitions.slug,
    title: row.form_definitions.title,
    version: row.version,
  }));
}

export async function listStudyPeriodSummaries(): Promise<
  StudyPeriodSummary[]
> {
  const { data, error } = await supabase
    .from("study_period_summaries")
    .select("*")
    .order("academic_year", { ascending: false });

  if (error) throw error;

  const studies = (data as StudySummaryRow[]).map((study) => ({
    id: study.id,
    formId: study.form_id,
    formVersionId: study.form_version_id,
    academicYear: study.academic_year,
    title: study.title,
    opensAt: study.opens_at,
    closesAt: study.closes_at,
    archivedAt: study.archived_at,
    status: study.status,
    responseCount: Number(study.response_count),
    submittedResponseCount: Number(study.submitted_response_count),
  }));

  return studies.sort((left, right) => {
    const statusOrder =
      Number(right.status === "open") - Number(left.status === "open");
    if (statusOrder !== 0) return statusOrder;

    const academicYearOrder = right.academicYear.localeCompare(
      left.academicYear,
    );
    if (academicYearOrder !== 0) return academicYearOrder;

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export async function listStudyDriveContexts() {
  const { data, error } = await supabase
    .from("study_periods")
    .select("id, academic_year")
    .order("academic_year", { ascending: false });

  if (error) throw error;

  return data.map((study) => ({
    studyId: study.id,
    academicYear: study.academic_year,
  }));
}

export async function createStudyPeriod({
  formVersionId,
  academicYear,
  title,
}: {
  formVersionId: string;
  academicYear: string;
  title: string;
}) {
  const { data: version, error: versionError } = await supabase
    .from("form_versions")
    .select("form_id")
    .eq("id", formVersionId)
    .not("published_at", "is", null)
    .single();

  if (versionError) throw versionError;

  const { data, error } = await supabase
    .from("study_periods")
    .insert({
      form_id: version.form_id,
      form_version_id: formVersionId,
      academic_year: academicYear,
      title,
      opens_at: new Date().toISOString(),
      closes_at: "9999-12-31T23:59:59.999Z",
      lifecycle_status: "closed",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function setStudyPeriodStatus(
  studyPeriodId: string,
  status: "open" | "closed",
) {
  const { data, error } = await supabase
    .from("study_periods")
    .update({ lifecycle_status: status })
    .eq("id", studyPeriodId)
    .select("id, lifecycle_status")
    .single();

  if (error) throw error;
  if (data.lifecycle_status !== status) {
    throw new Error("Study lifecycle status was not persisted.");
  }

  return data;
}

export async function updateStudyPeriodSchedule({
  studyPeriodId,
  title,
  opensAt,
  closesAt,
}: {
  studyPeriodId: string;
  title: string;
  opensAt: string;
  closesAt: string;
}) {
  const { data, error } = await supabase
    .from("study_periods")
    .update({
      title,
      opens_at: opensAt,
      closes_at: closesAt,
    })
    .eq("id", studyPeriodId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function archiveStudyPeriod(studyPeriodId: string) {
  const { data, error } = await supabase
    .from("study_periods")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", studyPeriodId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteStudyPeriod(studyPeriodId: string) {
  const { data, error } = await supabase.rpc("delete_study_period", {
    target_study_period_id: studyPeriodId,
  });

  if (error) throw error;
  return data === null ? null : Number(data);
}
