-- Lab module: tests assigned by doctors, uploaded results, AI analysis, notifications

CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  consultation_id UUID,
  doctor_id UUID,
  lab_tech_id UUID,
  test_type TEXT NOT NULL,
  test_name TEXT NOT NULL,
  instructions TEXT,
  priority TEXT NOT NULL DEFAULT 'routine', -- routine | urgent | stat
  status TEXT NOT NULL DEFAULT 'assigned', -- assigned | in_progress | completed | cancelled
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_tests_staff_read" ON public.lab_tests FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));

CREATE POLICY "lab_tests_patient_read" ON public.lab_tests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = lab_tests.patient_id AND p.account_id = auth.uid()));

CREATE POLICY "lab_tests_clinical_write" ON public.lab_tests FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]));

CREATE TRIGGER lab_tests_updated_at BEFORE UPDATE ON public.lab_tests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_lab_tests_status ON public.lab_tests(status);
CREATE INDEX idx_lab_tests_patient ON public.lab_tests(patient_id);

-- Lab reports (result values + uploaded file + AI analysis)
CREATE TABLE public.lab_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_test_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  uploaded_by UUID,
  file_path TEXT, -- storage path in 'lab-reports' bucket
  file_name TEXT,
  file_mime TEXT,
  results JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, value, unit, ref_low, ref_high, flag}]
  notes TEXT,
  ai_summary TEXT,
  ai_abnormalities JSONB DEFAULT '[]'::jsonb, -- [{parameter, value, severity, explanation}]
  ai_severity TEXT, -- normal | mild | moderate | severe | critical
  doctor_notified BOOLEAN NOT NULL DEFAULT false,
  doctor_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_reports_staff_read" ON public.lab_reports FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));

CREATE POLICY "lab_reports_patient_read" ON public.lab_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = lab_reports.patient_id AND p.account_id = auth.uid()));

CREATE POLICY "lab_reports_lab_write" ON public.lab_reports FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]));

CREATE TRIGGER lab_reports_updated_at BEFORE UPDATE ON public.lab_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_lab_reports_test ON public.lab_reports(lab_test_id);

-- Notifications for doctor (and others)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  sender_id UUID,
  kind TEXT NOT NULL, -- lab_result | emergency | prescription | message
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  severity TEXT DEFAULT 'info', -- info | warning | critical
  payload JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_self_read" ON public.notifications FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "notifications_self_update" ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "notifications_staff_insert" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);

-- Storage bucket for lab report files
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-reports', 'lab-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lab_reports_bucket_staff_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lab-reports' AND public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));

CREATE POLICY "lab_reports_bucket_lab_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lab-reports' AND public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]));

CREATE POLICY "lab_reports_bucket_lab_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lab-reports' AND public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]));

CREATE POLICY "lab_reports_bucket_lab_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lab-reports' AND public.has_any_role(auth.uid(), ARRAY['admin','doctor','lab']::app_role[]));