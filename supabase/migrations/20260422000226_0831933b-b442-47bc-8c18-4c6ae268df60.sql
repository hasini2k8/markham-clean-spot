
CREATE TABLE public.volunteer_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  supervisor_id UUID,
  student_name TEXT NOT NULL,
  student_school TEXT,
  supervisor_name TEXT NOT NULL,
  supervisor_email TEXT,
  hours NUMERIC(6,2) NOT NULL,
  activity_description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  unsigned_pdf_url TEXT,
  signed_pdf_url TEXT,
  signature_name TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students create own forms"
  ON public.volunteer_forms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Student or assigned supervisor view"
  ON public.volunteer_forms FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = supervisor_id OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Student updates own pending"
  ON public.volunteer_forms FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status = 'pending')
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Supervisor signs assigned"
  ON public.volunteer_forms FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

CREATE TRIGGER update_volunteer_forms_updated_at
  BEFORE UPDATE ON public.volunteer_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
  VALUES ('volunteer-forms', 'volunteer-forms', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read volunteer forms"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'volunteer-forms');

CREATE POLICY "Authenticated upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'volunteer-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supervisor upload signed"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'volunteer-forms' AND has_role(auth.uid(), 'supervisor'::app_role));
