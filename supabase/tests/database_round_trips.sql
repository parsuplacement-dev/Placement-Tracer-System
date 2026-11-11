-- Run after migrations against a disposable database. Fixtures are rolled back.
BEGIN;

DO $$
DECLARE
    test_form UUID;
    test_version UUID;
    test_study UUID;
    summary JSONB;
    baseline_count BIGINT;
    page_count INTEGER;
BEGIN
    baseline_count := (admin_dashboard_summary(NULL)->>'submitted_count')::BIGINT;
    INSERT INTO form_definitions (slug, title)
    VALUES ('db-performance-regression', 'Performance regression') RETURNING id INTO test_form;
    INSERT INTO form_versions (form_id, version, definition)
    VALUES (test_form, 1, '{"sections":[]}') RETURNING id INTO test_version;
    INSERT INTO study_periods (form_id, form_version_id, academic_year, title, opens_at, closes_at, lifecycle_status)
    VALUES (test_form, test_version, '2098-2099', 'Performance regression', NOW(), NOW() + INTERVAL '1 year', 'open')
    RETURNING id INTO test_study;

    ASSERT (SELECT id = test_study AND definition = '{"sections":[]}'::jsonb
            FROM get_open_study_context('db-performance-regression')), 'active study and definition must match';
    ASSERT NOT EXISTS (SELECT FROM get_open_study_context('missing-performance-study')), 'unknown form must return no study';

    -- More rows than the Data API's 1,000-row cap; totals must remain complete.
    INSERT INTO form_responses (study_period_id, user_id, status, submitted_at, answers)
    SELECT test_study, 'performance-' || n, 'submitted', NOW(),
           jsonb_build_object('program', '__performance_a', 'employmentStatus', 'Yes')
    FROM generate_series(1, 1005) AS n;
    INSERT INTO form_responses (study_period_id, user_id, status, submitted_at, answers)
    VALUES
        (test_study, 'performance-other', 'submitted', NOW(), '{"program":"__performance_b","employmentStatus":"No"}'),
        (test_study, 'performance-draft', 'draft', NULL, '{"program":"__performance_a","employmentStatus":"Never Employed"}'),
        (test_study, 'performance-deleting', 'submitted', NOW(), '{"program":"__performance_a","employmentStatus":"Yes"}');
    UPDATE form_responses SET deletion_status = 'deleting' WHERE user_id = 'performance-deleting';
    INSERT INTO form_responses (study_period_id, source, entered_by_user_id, status, import_status, answers)
    VALUES (test_study, 'admin_import', 'performance-admin', 'draft', 'processing', '{"program":"__performance_a"}');

    summary := admin_dashboard_summary(ARRAY['__performance_a']);
    ASSERT (summary->>'submitted_count')::INTEGER = 1005, 'scoped total must include rows beyond the API cap';
    ASSERT (summary->'study_counts'->0->>'response_count')::INTEGER = 1006, 'exclude deleting and processing rows; include drafts';
    ASSERT (summary->'study_counts'->0->>'submitted_count')::INTEGER = 1005, 'study submitted total';
    ASSERT (summary->'employment_counts'->>'employed')::INTEGER = 1005, 'employment counts include only submitted rows';
    ASSERT (summary->'employment_counts'->>'unemployed')::INTEGER = 0, 'other program must be excluded';
    ASSERT (summary->'employment_counts'->>'never_employed')::INTEGER = 0, 'draft answers must not affect employment counts';
    ASSERT jsonb_array_length(summary->'program_counts') = 1, 'program totals must respect scope';
    ASSERT (summary->'program_counts'->0->>'count')::INTEGER = 1005, 'program total';
    ASSERT jsonb_array_length(summary->'recent_responses') = 5, 'recent responses must stay bounded';
    ASSERT NOT EXISTS (
        SELECT FROM jsonb_array_elements(summary->'recent_responses') AS item
        WHERE item->>'program' <> '__performance_a' OR item->>'deletion_status' <> 'active'
    ), 'recent responses must respect access and lifecycle filters';

    summary := admin_dashboard_summary(ARRAY[]::TEXT[]);
    ASSERT (summary->>'submitted_count')::INTEGER = 0, 'empty scope must grant no responses';
    ASSERT summary->'recent_responses' = '[]'::jsonb AND summary->'study_counts' = '[]'::jsonb
           AND summary->'program_counts' = '[]'::jsonb, 'empty scope must return empty collections';
    ASSERT (admin_dashboard_summary(NULL)->>'submitted_count')::BIGINT = baseline_count + 1006,
           'admin view must include all programs and exclude deleting rows';

    UPDATE study_periods SET lifecycle_status = 'closed' WHERE id = test_study;
    ASSERT NOT EXISTS (SELECT FROM get_open_study_context('db-performance-regression')), 'closed study must not be returned';

    INSERT INTO auth_accounts (id, name, email)
    SELECT 'performance-account-' || n, 'Performance Person ' || n, 'performance-' || n || '@example.test'
    FROM generate_series(1, 105) AS n;
    SELECT COUNT(*) INTO page_count FROM (
        SELECT id FROM auth_accounts WHERE account_search_text ILIKE '%performance person%'
        ORDER BY created_at DESC, id LIMIT 10 OFFSET 100
    ) AS page;
    ASSERT page_count = 5, 'account pagination must return only the requested page';
    ASSERT (SELECT COUNT(*) FROM auth_accounts WHERE account_search_text ILIKE '%performance-105@example.test%') = 1,
           'account search must match email';

    ASSERT NOT has_function_privilege('anon', 'admin_dashboard_summary(text[])', 'EXECUTE'), 'anonymous dashboard access must be denied';
    ASSERT NOT has_function_privilege('authenticated', 'admin_dashboard_summary(text[])', 'EXECUTE'), 'dashboard scope is server-controlled';
    ASSERT NOT has_function_privilege('anon', 'get_open_study_context(text)', 'EXECUTE'), 'anonymous study access must be denied';
    ASSERT has_function_privilege('service_role', 'admin_dashboard_summary(text[])', 'EXECUTE'), 'service role needs dashboard access';
END;
$$;

ROLLBACK;
