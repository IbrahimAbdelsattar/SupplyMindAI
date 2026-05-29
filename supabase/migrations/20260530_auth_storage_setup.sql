-- ============================================================================
-- Supabase Storage and Authentication Setup
-- ============================================================================
-- This migration sets up Supabase storage buckets for SupplyMind AI

-- Create storage buckets
-- Run these in Supabase SQL Editor to create public buckets

-- Documents bucket for PDFs, Word docs, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    20971520,  -- 20MB
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/json']
) ON CONFLICT DO NOTHING;

-- Data imports bucket for CSV and Excel files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'data-imports',
    'data-imports',
    true,
    52428800,  -- 50MB
    ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT DO NOTHING;

-- Reports bucket for generated reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    true,
    20971520,  -- 20MB
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT DO NOTHING;

-- Forecasts bucket for forecast exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'forecasts',
    'forecasts',
    true,
    10485760,  -- 10MB
    ARRAY['text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT DO NOTHING;

-- Avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Row Level Security Policies for Storage Buckets
-- ============================================================================

-- Documents bucket - users can only access their own files
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Data imports bucket
CREATE POLICY "Users can upload data files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'data-imports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their data imports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'data-imports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their data imports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'data-imports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reports bucket
CREATE POLICY "Users can upload reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Forecasts bucket
CREATE POLICY "Users can upload forecasts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forecasts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their forecasts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'forecasts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket - public read, users can upload their own
CREATE POLICY "Users can upload their avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================================================
-- Auth Configuration
-- ============================================================================

-- Enable email sign-up
-- Configure in Supabase dashboard:
-- 1. Go to Authentication → Settings
-- 2. Enable "Email provider"
-- 3. Set email confirmation to optional or required
-- 4. Enable "Confirm email" notifications

-- OAuth providers (optional, configure in dashboard):
-- - Google
-- - GitHub
-- - Microsoft
-- - Discord

-- ============================================================================
-- Sync Supabase Auth with Application Users
-- ============================================================================

-- Create trigger to sync Supabase auth.users with app.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_app_meta_data->>'role', 'analyst'),
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    name = COALESCE(NEW.raw_user_meta_data->>'name', users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Audit Log for Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.storage_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'upload', 'download', 'delete'
  bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_audit_log_user_id ON public.storage_audit_log(user_id);
CREATE INDEX idx_storage_audit_log_created_at ON public.storage_audit_log(created_at DESC);
CREATE INDEX idx_storage_audit_log_bucket ON public.storage_audit_log(bucket);

-- ============================================================================
-- Session Management
-- ============================================================================

-- Sessions are handled automatically by Supabase Auth
-- Access tokens expire in 1 hour by default
-- Refresh tokens valid for 7 days by default
-- Configure in Supabase dashboard → Authentication → Settings

-- ============================================================================
-- Enable Authentication Webhooks (optional)
-- ============================================================================

-- Create webhooks in Supabase dashboard:
-- 1. Go to Authentication → Webhooks
-- 2. Add webhook for user signup
-- 3. Add webhook for user signin
-- 4. Add webhook for user delete

-- Webhook events available:
-- - user.created
-- - user.updated
-- - user.deleted
-- - session.created
