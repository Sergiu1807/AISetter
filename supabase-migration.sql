-- AI Appointment Setter - Supabase Database Migration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main leads table
CREATE TABLE leads (
  -- Identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manychat_user_id TEXT UNIQUE NOT NULL,
  instagram_handle TEXT,
  name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  -- Lead Source
  lead_source TEXT DEFAULT 'dm_direct',
  initial_engagement TEXT,
  known_details TEXT,

  -- Conversation State
  conversation_phase TEXT DEFAULT 'P1',
  qualification_status TEXT DEFAULT 'new',

  -- Collected Data (flexible JSONB)
  collected_data JSONB DEFAULT '{}'::jsonb,

  -- Steps Tracking
  steps_completed TEXT[] DEFAULT '{}',

  -- Control Flags
  is_new BOOLEAN DEFAULT true,
  is_returning BOOLEAN DEFAULT false,
  bot_paused BOOLEAN DEFAULT false,
  needs_human BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,

  -- Outcome
  call_booked BOOLEAN DEFAULT false,
  call_date TIMESTAMPTZ,
  final_status TEXT DEFAULT 'in_progress',

  -- Conversation History (all messages)
  messages JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,

  -- Debug & Analytics
  last_ai_analysis TEXT,
  error_count INTEGER DEFAULT 0,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_leads_manychat_id ON leads(manychat_user_id);
CREATE INDEX idx_leads_status ON leads(qualification_status);
CREATE INDEX idx_leads_needs_human ON leads(needs_human) WHERE needs_human = true;
CREATE INDEX idx_leads_bot_paused ON leads(bot_paused) WHERE bot_paused = true;
CREATE INDEX idx_leads_last_message ON leads(last_message_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify migration
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS total_leads FROM leads;
