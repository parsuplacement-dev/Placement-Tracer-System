import { supabase } from "@/lib/supabase/server";
import {
  FormDefinition,
  StudyContext,
  StudyPeriod,
  StudyPeriodStatus,
} from "@/types";

interface StudyPeriodRow {
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

interface StudyContextRow extends StudyPeriodRow {
  definition: FormDefinition;
}

function mapStudyPeriod(row: StudyPeriodRow): StudyPeriod {
  return {
    id: row.id,
    formId: row.form_id,
    formVersionId: row.form_version_id,
    academicYear: row.academic_year,
    title: row.title,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    archivedAt: row.archived_at,
    status: row.status,
  };
}

export async function getOpenStudyByFormSlug(
  slug: string,
): Promise<StudyContext | null> {
  const { data: study, error: studyError } = await supabase
    .rpc("get_open_study_context", { target_slug: slug })
    .maybeSingle();

  if (studyError) throw studyError;
  if (!study) return null;

  const studyRow = study as StudyContextRow;

  return {
    study: mapStudyPeriod(studyRow),
    definition: studyRow.definition,
  };
}

export async function getStudyContext(
  studyPeriodId: string,
): Promise<StudyContext | null> {
  const { data: study, error } = await supabase
    .from("study_contexts")
    .select("*")
    .eq("id", studyPeriodId)
    .maybeSingle();

  if (error) throw error;
  if (!study) return null;

  const studyRow = study as StudyContextRow;

  return {
    study: mapStudyPeriod(studyRow),
    definition: studyRow.definition,
  };
}

export async function listStudyPeriods(): Promise<StudyPeriod[]> {
  const { data, error } = await supabase
    .from("study_periods_with_status")
    .select("*")
    .order("academic_year", { ascending: false });

  if (error) throw error;

  return (data as StudyPeriodRow[]).map(mapStudyPeriod);
}

export async function listStudyPeriodsForFormVersion(
  slug: string,
  version: number,
): Promise<StudyPeriod[]> {
  const { data: form, error: formError } = await supabase
    .from("form_definitions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (formError) throw formError;
  if (!form) return [];

  const { data: formVersion, error: versionError } = await supabase
    .from("form_versions")
    .select("id")
    .eq("form_id", form.id)
    .eq("version", version)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!formVersion) return [];

  const { data, error } = await supabase
    .from("study_periods_with_status")
    .select("*")
    .eq("form_version_id", formVersion.id)
    .order("academic_year", { ascending: false });

  if (error) throw error;

  return (data as StudyPeriodRow[]).map(mapStudyPeriod);
}
