-- Explicitly deny browser/client access to private rank-exam attempts.
-- The quiz-engine Edge Function uses the service_role key after validating the caller.
DROP POLICY IF EXISTS rank_exam_attempts_deny_client ON public.rank_exam_attempts;
CREATE POLICY rank_exam_attempts_deny_client
ON public.rank_exam_attempts
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Keep score/progression RPCs callable only by trusted server-side code.
REVOKE ALL ON FUNCTION public.complete_quiz_attempt(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_quiz_attempt(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.complete_rank_exam(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_rank_exam(uuid, uuid, jsonb) TO service_role;
