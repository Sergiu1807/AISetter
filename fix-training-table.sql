-- Fix training_examples table schema
-- This script recreates the training_examples table with all required columns

-- Drop incomplete table if exists
DROP TABLE IF EXISTS training_examples CASCADE;

-- Create training_examples table with complete schema
CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Core fields (these were missing in the incomplete migration)
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  expected_response TEXT,
  feedback TEXT NOT NULL,

  -- Classification and status
  example_type TEXT NOT NULL CHECK (example_type IN ('good', 'bad', 'correction')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_training_status ON training_examples(status);
CREATE INDEX idx_training_submitted ON training_examples(submitted_by);
CREATE INDEX idx_training_created ON training_examples(created_at DESC);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_training_examples_updated_at
  BEFORE UPDATE ON training_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can view training examples
CREATE POLICY "Users can view training examples" ON training_examples
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Operators and above can submit training examples
CREATE POLICY "Operators can submit training examples" ON training_examples
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'operator')
    )
  );

-- Managers and admins can update training examples (approve/reject)
CREATE POLICY "Managers can update training examples" ON training_examples
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
