-- Fetch the active study and its form definition in one request.
CREATE OR REPLACE FUNCTION get_open_study_context(target_slug TEXT)
RETURNS SETOF study_contexts
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT context.*
    FROM study_contexts AS context
    JOIN form_definitions AS form ON form.id = context.form_id
    WHERE form.slug = target_slug AND context.status = 'open'
    ORDER BY context.academic_year DESC, context.opens_at DESC, context.id DESC
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_open_study_context(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_open_study_context(TEXT) TO service_role;

-- Account list searches and pagination now run in PostgreSQL.
-- Keeping the search term in one ilike value avoids interpolating PostgREST OR syntax.
ALTER TABLE auth_accounts
ADD COLUMN account_search_text TEXT GENERATED ALWAYS AS (
    LOWER(COALESCE(name, '') || ' ' || COALESCE(email, ''))
) STORED;

CREATE INDEX idx_auth_accounts_search_text
ON auth_accounts USING GIN (account_search_text gin_trgm_ops);

CREATE INDEX idx_auth_accounts_created_at_id ON auth_accounts (created_at DESC, id);
CREATE INDEX idx_auth_accounts_role_created_at_id ON auth_accounts (role, created_at DESC, id);

-- Return bounded dashboard data instead of every response in 1,000-row batches.
-- A NULL program array grants the admin view; an empty array grants no responses.
-- This function remains service-role-only, like the existing summary view.
CREATE OR REPLACE FUNCTION admin_dashboard_summary(allowed_program_values TEXT[] DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH scoped AS MATERIALIZED (
        SELECT * FROM admin_response_summaries
        WHERE import_status = 'completed'
          AND deletion_status = 'active'
          AND (allowed_program_values IS NULL OR program = ANY(allowed_program_values))
    ), study_counts AS (
        SELECT study_period_id, COUNT(*) AS response_count,
               COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_count
        FROM scoped GROUP BY study_period_id
    ), program_counts AS (
        SELECT COALESCE(NULLIF(BTRIM(program), ''), 'Not specified') AS program,
               COUNT(*) AS count
        FROM scoped WHERE status = 'submitted'
        GROUP BY COALESCE(NULLIF(BTRIM(program), ''), 'Not specified')
    ), recent AS (
        SELECT * FROM scoped ORDER BY created_at DESC, id DESC LIMIT 5
    )
    SELECT jsonb_build_object(
        'study_counts', COALESCE((
            SELECT jsonb_agg(to_jsonb(counts)) FROM study_counts AS counts
        ), '[]'::jsonb),
        'submitted_count', COUNT(*) FILTER (WHERE status = 'submitted'),
        'employment_counts', jsonb_build_object(
            'employed', COUNT(*) FILTER (WHERE status = 'submitted' AND employment_status = 'Yes'),
            'unemployed', COUNT(*) FILTER (WHERE status = 'submitted' AND employment_status = 'No'),
            'never_employed', COUNT(*) FILTER (WHERE status = 'submitted' AND employment_status = 'Never Employed')
        ),
        'program_counts', COALESCE((
            SELECT jsonb_agg(to_jsonb(counts) ORDER BY count DESC, program)
            FROM program_counts AS counts
        ), '[]'::jsonb),
        'recent_responses', COALESCE((
            SELECT jsonb_agg(to_jsonb(recent) - 'search_text' - 'sort_name' ORDER BY created_at DESC, id DESC)
            FROM recent
        ), '[]'::jsonb)
    ) FROM scoped;
$$;

REVOKE ALL ON FUNCTION admin_dashboard_summary(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_dashboard_summary(TEXT[]) TO service_role;

NOTIFY pgrst, 'reload schema';
