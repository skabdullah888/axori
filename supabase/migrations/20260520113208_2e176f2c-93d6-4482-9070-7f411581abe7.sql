REVOKE EXECUTE ON FUNCTION public.credit_approved_task_submission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.credit_approved_task_submission() FROM anon;
REVOKE EXECUTE ON FUNCTION public.credit_approved_task_submission() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) TO authenticated;