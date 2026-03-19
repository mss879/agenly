-- ============================================================
-- Migration 015: User Profiles & Onboarding Responses
-- ============================================================

-- User profiles (extends Supabase auth.users with name + role)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding questionnaire responses
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  has_created_agent_before BOOLEAN,
  role_title TEXT CHECK (role_title IN ('business_owner', 'developer', 'marketer', 'agency', 'other')),
  company_size TEXT CHECK (company_size IN ('solo', '2-10', '11-50', '51-200', '200+')),
  primary_use_case TEXT CHECK (primary_use_case IN ('customer_support', 'sales', 'internal_ops', 'lead_generation', 'other')),
  how_heard_about_us TEXT CHECK (how_heard_about_us IN ('google', 'social_media', 'friend_referral', 'blog_article', 'youtube', 'other')),
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_onboarding_user ON onboarding_responses(user_id);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- onboarding_responses policies
CREATE POLICY "Users can manage own onboarding"
  ON onboarding_responses FOR ALL
  USING (user_id = auth.uid());

-- Admin can view all onboarding responses
CREATE POLICY "Admins can view all onboarding responses"
  ON onboarding_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated_at trigger
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
