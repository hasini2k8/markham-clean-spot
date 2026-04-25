DROP POLICY IF EXISTS "Student or assigned supervisor view" ON public.volunteer_forms;
DROP POLICY IF EXISTS "Supervisor signs assigned" ON public.volunteer_forms;

CREATE POLICY "Student or matching supervisor view"
ON public.volunteer_forms
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR auth.uid() = supervisor_id
  OR (
    public.has_role(auth.uid(), 'supervisor'::app_role)
    AND supervisor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Matching supervisor signs assigned forms"
ON public.volunteer_forms
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND status = 'pending'
  AND (
    auth.uid() = supervisor_id
    OR supervisor_id IS NULL
    OR supervisor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND supervisor_id = auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_forms_supervisor_id_status
ON public.volunteer_forms(supervisor_id, status);

CREATE INDEX IF NOT EXISTS idx_volunteer_forms_supervisor_email_status
ON public.volunteer_forms(supervisor_email, status);