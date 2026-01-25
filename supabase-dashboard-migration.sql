-- AI Appointment Setter - Dashboard Migration
-- Phase 1, Week 1, Day 2: Database Schema Setup
-- Run this in your Supabase SQL Editor AFTER the main migration

-- =============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  avatar_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Preferences
  preferences JSONB DEFAULT '{
    "theme": "light",
    "notifications": {
      "browser": true,
      "email": false,
      "sound": true
    },
    "dashboard": {
      "default_page": "/dashboard",
      "items_per_page": 25
    }
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Auto-update updated_at trigger for users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR USERS
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view themselves
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Only admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update users
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and managers can view all audit logs
CREATE POLICY "Admins and managers can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- System can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- UPDATE LEADS TABLE WITH DASHBOARD FIELDS
-- =============================================================================

-- Add new columns to leads table if they don't exist
DO $$
BEGIN
  -- Add assigned_to for lead assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'assigned_to') THEN
    ALTER TABLE leads ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add tags for categorization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'tags') THEN
    ALTER TABLE leads ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;

  -- Add priority level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'priority') THEN
    ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  -- Add rating for conversation quality
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'rating') THEN
    ALTER TABLE leads ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;

  -- Add feedback for training
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'feedback') THEN
    ALTER TABLE leads ADD COLUMN feedback TEXT;
  END IF;

  -- Add last_human_message_at for tracking human interventions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'leads' AND column_name = 'last_human_message_at') THEN
    ALTER TABLE leads ADD COLUMN last_human_message_at TIMESTAMPTZ;
  END IF;
END $$;

-- Additional indexes for new fields
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_rating ON leads(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN(tags);

-- =============================================================================
-- RLS FOR LEADS TABLE
-- =============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all leads
CREATE POLICY "Authenticated users can view leads" ON leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Operators and above can insert leads
CREATE POLICY "Operators can insert leads" ON leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'operator')
    )
  );

-- Operators and above can update leads
CREATE POLICY "Operators can update leads" ON leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'operator')
    )
  );

-- Only admins can delete leads
CREATE POLICY "Admins can delete leads" ON leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role (webhook) can manage all leads
CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL USING (true);

-- =============================================================================
-- TRAINING DATA TABLE (for continuous improvement)
-- =============================================================================

CREATE TABLE IF NOT EXISTS training_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  example_type TEXT NOT NULL CHECK (example_type IN ('good', 'bad', 'correction')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Example data
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  expected_response TEXT,
  feedback TEXT,

  -- Metadata
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for training examples
CREATE INDEX IF NOT EXISTS idx_training_status ON training_examples(status);
CREATE INDEX IF NOT EXISTS idx_training_submitted ON training_examples(submitted_by);
CREATE INDEX IF NOT EXISTS idx_training_created ON training_examples(created_at DESC);

-- Auto-update trigger
CREATE TRIGGER update_training_examples_updated_at
  BEFORE UPDATE ON training_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for training_examples
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view and submit training examples
CREATE POLICY "Users can view training examples" ON training_examples
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Operators can submit training examples" ON training_examples
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'operator')
    )
  );

-- Managers and admins can approve/reject
CREATE POLICY "Managers can update training examples" ON training_examples
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- =============================================================================
-- PROMPT VERSIONS TABLE (for prompt management)
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  system_instructions TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false,
  deployed_at TIMESTAMPTZ,
  notes TEXT,

  -- Performance tracking
  total_conversations INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one active prompt at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_active ON prompt_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_version ON prompt_versions(version DESC);

-- Auto-update trigger
CREATE TRIGGER update_prompt_versions_updated_at
  BEFORE UPDATE ON prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for prompt_versions
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view prompt versions
CREATE POLICY "Users can view prompt versions" ON prompt_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Only admins can manage prompts
CREATE POLICY "Admins can manage prompts" ON prompt_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('needs_human', 'lead_assigned', 'system_alert', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all tables exist
DO $$
DECLARE
  v_users_exists BOOLEAN;
  v_audit_logs_exists BOOLEAN;
  v_training_exists BOOLEAN;
  v_prompts_exists BOOLEAN;
  v_notifications_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') INTO v_users_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') INTO v_audit_logs_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_examples') INTO v_training_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_versions') INTO v_prompts_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') INTO v_notifications_exists;

  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE 'Users table: %', v_users_exists;
  RAISE NOTICE 'Audit logs table: %', v_audit_logs_exists;
  RAISE NOTICE 'Training examples table: %', v_training_exists;
  RAISE NOTICE 'Prompt versions table: %', v_prompts_exists;
  RAISE NOTICE 'Notifications table: %', v_notifications_exists;

  IF v_users_exists AND v_audit_logs_exists AND v_training_exists AND v_prompts_exists AND v_notifications_exists THEN
    RAISE NOTICE '✓ Dashboard migration completed successfully!';
  ELSE
    RAISE WARNING '⚠ Some tables were not created. Please check the migration.';
  END IF;
END $$;

-- Display summary
SELECT 'Dashboard Migration Complete!' AS status;
SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM audit_logs) AS total_audit_logs,
  (SELECT COUNT(*) FROM training_examples) AS total_training_examples,
  (SELECT COUNT(*) FROM prompt_versions) AS total_prompt_versions,
  (SELECT COUNT(*) FROM notifications) AS total_notifications;
