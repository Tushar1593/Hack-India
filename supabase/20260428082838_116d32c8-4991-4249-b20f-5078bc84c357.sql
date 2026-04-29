-- Roles enum and table (separate from profiles to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'lab', 'pharmacy', 'patient');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- SECURITY DEFINER role check (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Auto-create profile + default 'patient' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Patients registry (can exist without auth account)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  age INT,
  sex TEXT CHECK (sex IN ('male', 'female', 'other')),
  phone TEXT,
  room TEXT,
  account_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chief_complaint TEXT,
  voice_transcript TEXT,
  voice_language TEXT,
  detected_symptoms JSONB DEFAULT '[]'::jsonb,
  ai_diagnosis JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triaged', 'with_doctor', 'lab', 'pharmacy', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  heart_rate INT,
  bp_systolic INT,
  bp_diastolic INT,
  temperature_c NUMERIC(4,1),
  spo2 INT,
  respiratory_rate INT,
  glucose INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.consultations (status, created_at DESC);
CREATE INDEX ON public.vitals (patient_id, recorded_at DESC);
CREATE INDEX ON public.patients (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_patients BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_consultations BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_staff_read" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::public.app_role[]));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- patients
CREATE POLICY "patients_staff_read" ON public.patients FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::public.app_role[]));
CREATE POLICY "patients_self_read" ON public.patients FOR SELECT TO authenticated USING (account_id = auth.uid());
CREATE POLICY "patients_clinical_write" ON public.patients FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]));

-- consultations
CREATE POLICY "consultations_staff_read" ON public.consultations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::public.app_role[]));
CREATE POLICY "consultations_patient_read" ON public.consultations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.account_id = auth.uid()));
CREATE POLICY "consultations_clinical_write" ON public.consultations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]));

-- vitals
CREATE POLICY "vitals_staff_read" ON public.vitals FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::public.app_role[]));
CREATE POLICY "vitals_patient_read" ON public.vitals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.account_id = auth.uid()));
CREATE POLICY "vitals_clinical_write" ON public.vitals FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse']::public.app_role[]));
