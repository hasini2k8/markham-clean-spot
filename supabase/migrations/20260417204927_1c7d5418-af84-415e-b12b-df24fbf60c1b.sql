
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('volunteer', 'supervisor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile + default volunteer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'volunteer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup sessions
CREATE TYPE public.cleanup_status AS ENUM ('in_progress', 'pending_review', 'approved', 'rejected');
CREATE TYPE public.ai_verdict AS ENUM ('clean', 'not_clean', 'unclear');

CREATE TABLE public.cleanup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  before_photo_url TEXT,
  after_photo_url TEXT,
  ai_verdict public.ai_verdict,
  ai_reasoning TEXT,
  status public.cleanup_status NOT NULL DEFAULT 'in_progress',
  supervisor_id UUID REFERENCES auth.users(id),
  supervisor_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lat_in_markham CHECK (lat BETWEEN 43.80 AND 43.92),
  CONSTRAINT lng_in_markham CHECK (lng BETWEEN -79.40 AND -79.21)
);

ALTER TABLE public.cleanup_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers view own sessions, supervisors view all"
  ON public.cleanup_sessions FOR SELECT TO authenticated
  USING (auth.uid() = volunteer_id OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Volunteers create own sessions"
  ON public.cleanup_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers update own in-progress/pending sessions"
  ON public.cleanup_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = volunteer_id AND status IN ('in_progress', 'pending_review'))
  WITH CHECK (auth.uid() = volunteer_id AND status IN ('in_progress', 'pending_review'));

CREATE POLICY "Supervisors review sessions"
  ON public.cleanup_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE TRIGGER update_cleanup_sessions_updated_at BEFORE UPDATE ON public.cleanup_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cleanup_status ON public.cleanup_sessions(status);
CREATE INDEX idx_cleanup_volunteer ON public.cleanup_sessions(volunteer_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cleanup-photos', 'cleanup-photos', true);

CREATE POLICY "Public read cleanup photos" ON storage.objects FOR SELECT USING (bucket_id = 'cleanup-photos');
CREATE POLICY "Auth upload cleanup photos to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cleanup-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth update own cleanup photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cleanup-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
