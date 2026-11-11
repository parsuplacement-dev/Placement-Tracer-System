import ResponseWorkspace from "@/components/responses/ResponseWorkspace";
import { requireUser } from "@/lib/auth";
import { formResponseToSurvey } from "@/lib/forms/graduate-tracer-adapter";
import {
  getFormResponseDocuments,
  listFormResponsesByUser,
} from "@/lib/repositories/form-responses.repository";
import {
  getOpenStudyByFormSlug,
  getStudyContext,
} from "@/lib/repositories/forms.repository";
import { defaultSurvey } from "@/lib/surveys/defaults";

export default async function ResponsesPage() {
  const { user } = await requireUser();
  const [openContext, previousResponses] = await Promise.all([
    getOpenStudyByFormSlug("graduate-tracer"),
    listFormResponsesByUser(user.id),
  ]);
  const response = openContext
    ? (previousResponses.find(
        (item) => item.studyPeriodId === openContext.study.id,
      ) ?? null)
    : (previousResponses[0] ?? null);
  const [context, documents] = await Promise.all([
    openContext ?? (response ? getStudyContext(response.studyPeriodId) : null),
    response ? getFormResponseDocuments(response.id) : [],
  ]);

  if (!context) {
    return (
      <div className="w-full max-w-5xl rounded-3xl border border-warning/30 bg-warning/10 p-8 text-center text-warning">
        <h1 className="text-2xl font-semibold">No tracer study available</h1>
        <p className="mt-2 text-sm">
          There is no open study or previous response to display right now.
        </p>
      </div>
    );
  }

  const responseView = response
    ? formResponseToSurvey(response, documents)
    : { ...defaultSurvey, userId: user.id };
  const readOnly = context.study.status !== "open";

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="w-full max-w-5xl text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Academic Year {context.study.academicYear}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {context.study.title}
        </h1>
        <p className="text-muted-foreground">
          {readOnly
            ? "This study is closed. Your response is available in read-only mode."
            : "Please answer all fields completely and accurately."}
        </p>
      </div>
      <ResponseWorkspace
        survey={responseView}
        isNew={!response}
        updatedAt={response?.updatedAt}
        responseId={response?.id}
        responseStatus={response?.status ?? "draft"}
        studyId={context.study.id}
        readOnly={readOnly}
      />
    </div>
  );
}
