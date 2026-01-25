-- Migration Script - Add Missing Tables to Existing Schema
-- This preserves your existing 'leads' table and adds complementary tables

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING LEADS TABLE (if needed)
-- ============================================================================

-- Add status column if it doesn't exist (maps to qualification_status)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leads' AND column_name = 'status') THEN
        ALTER TABLE public.leads ADD COLUMN status TEXT;
        -- Map existing data
        UPDATE public.leads SET status =
            CASE
                WHEN qualification_status = 'qualified' THEN 'qualified'
                WHEN qualification_status = 'not_fit' THEN 'not_fit'
                WHEN call_booked = true THEN 'booked'
                WHEN qualification_status = 'new' THEN 'new'
                ELSE 'exploring'
            END;
    END IF;
END $$;

-- Add current_phase column if needed (maps to conversation_phase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leads' AND column_name = 'current_phase') THEN
        ALTER TABLE public.leads ADD COLUMN current_phase TEXT DEFAULT 'P1';
        -- Map existing phases if they exist
        UPDATE public.leads SET current_phase =
            CASE
                WHEN conversation_phase LIKE '%P1%' THEN 'P1'
                WHEN conversation_phase LIKE '%P2%' THEN 'P2'
                WHEN conversation_phase LIKE '%P3%' THEN 'P3'
                WHEN conversation_phase LIKE '%P4%' THEN 'P4'
                WHEN conversation_phase LIKE '%P5%' THEN 'P5'
                WHEN conversation_phase LIKE '%P6%' THEN 'P6'
                WHEN conversation_phase LIKE '%P7%' THEN 'P7'
                WHEN conversation_phase = 'DONE' THEN 'P7'
                ELSE 'P1'
            END;
    END IF;
END $$;

-- Add handle column (maps to instagram_handle)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leads' AND column_name = 'handle') THEN
        ALTER TABLE public.leads ADD COLUMN handle TEXT;
        UPDATE public.leads SET handle = instagram_handle WHERE instagram_handle IS NOT NULL;
    END IF;
END $$;

-- Add has_errors column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leads' AND column_name = 'has_errors') THEN
        ALTER TABLE public.leads ADD COLUMN has_errors BOOLEAN DEFAULT false;
        UPDATE public.leads SET has_errors = (error_count > 0) WHERE error_count IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- CONVERSATIONS TABLE (Complement to existing leads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    bot_active BOOLEAN DEFAULT true,
    human_taken_over BOOLEAN DEFAULT false,
    taken_over_by UUID REFERENCES public.users(id),
    taken_over_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(lead_id)
);

-- Create conversations for existing leads
INSERT INTO public.conversations (lead_id, bot_active, human_taken_over, taken_over_by)
SELECT
    id,
    NOT COALESCE(bot_paused, false),
    COALESCE(needs_human, false),
    assigned_to
FROM public.leads
WHERE id NOT IN (SELECT lead_id FROM public.conversations)
ON CONFLICT (lead_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_taken_over_by ON public.conversations(taken_over_by);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations for accessible leads" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = conversations.lead_id
            AND (
                public.get_user_role() IN ('admin', 'manager')
                OR leads.assigned_to = auth.uid()
            )
        )
    );

-- ============================================================================
-- MESSAGES TABLE (Normalized version of JSON messages in leads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('bot', 'lead', 'human')),
    sender_id UUID REFERENCES public.users(id),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for accessible conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.leads l ON l.id = c.lead_id
            WHERE c.id = messages.conversation_id
            AND (
                public.get_user_role() IN ('admin', 'manager')
                OR l.assigned_to = auth.uid()
            )
        )
    );

-- Migrate existing messages from leads table to messages table
DO $$
DECLARE
    lead_record RECORD;
    msg JSONB;
    conv_id UUID;
BEGIN
    FOR lead_record IN SELECT id, messages FROM public.leads WHERE messages IS NOT NULL LOOP
        -- Get conversation ID
        SELECT id INTO conv_id FROM public.conversations WHERE lead_id = lead_record.id;

        IF conv_id IS NOT NULL AND jsonb_array_length(lead_record.messages) > 0 THEN
            -- Insert each message
            FOR msg IN SELECT * FROM jsonb_array_elements(lead_record.messages) LOOP
                INSERT INTO public.messages (
                    conversation_id,
                    sender_type,
                    content,
                    status,
                    metadata,
                    created_at
                ) VALUES (
                    conv_id,
                    CASE
                        WHEN msg->>'role' = 'user' THEN 'lead'
                        WHEN msg->>'role' = 'assistant' THEN 'bot'
                        ELSE 'bot'
                    END,
                    msg->>'content',
                    'read',
                    COALESCE(msg->'meta', '{}'::jsonb),
                    COALESCE((msg->>'timestamp')::timestamptz, now())
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN (
        'new_lead', 'message_sent', 'message_received', 'phase_change',
        'call_booked', 'human_takeover', 'bot_resumed', 'error',
        'lead_qualified', 'lead_disqualified'
    )),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities" ON public.activities
    FOR SELECT USING (
        public.get_user_role() IN ('admin', 'manager', 'operator')
    );

CREATE POLICY "System can insert activities" ON public.activities
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "All users can read system settings" ON public.system_settings
    FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('bot_auto_response', 'true', 'Enable automatic bot responses'),
    ('human_handoff_enabled', 'true', 'Allow automatic handoff to humans'),
    ('working_hours', '"9:00 AM - 6:00 PM"', 'Business working hours'),
    ('timezone', '"Europe/Bucharest"', 'System timezone'),
    ('max_concurrent_conversations', '50', 'Maximum concurrent conversations'),
    ('response_delay', '2', 'Delay before bot responds (seconds)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- KNOWLEDGE BASE & TRAINING TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.response_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id),
    rating TEXT CHECK (rating IN ('good', 'needs_improvement', 'bad')),
    lead_type TEXT,
    outcome TEXT,
    messages_snapshot JSONB,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON public.response_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity creation on message insert
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id UUID;
    v_lead_name TEXT;
    v_lead_handle TEXT;
BEGIN
    SELECT l.id, l.name, COALESCE(l.handle, l.instagram_handle)
    INTO v_lead_id, v_lead_name, v_lead_handle
    FROM public.conversations c
    JOIN public.leads l ON l.id = c.lead_id
    WHERE c.id = NEW.conversation_id;

    INSERT INTO public.activities (
        type,
        lead_id,
        user_id,
        title,
        description,
        metadata
    ) VALUES (
        CASE WHEN NEW.sender_type = 'lead' THEN 'message_received' ELSE 'message_sent' END,
        v_lead_id,
        NEW.sender_id,
        CASE WHEN NEW.sender_type = 'lead' THEN 'Message Received' ELSE 'Message Sent' END,
        v_lead_name || ': "' || LEFT(NEW.content, 100) || '"',
        jsonb_build_object('sender_type', NEW.sender_type, 'message_preview', LEFT(NEW.content, 200))
    );

    UPDATE public.leads
    SET message_count = message_count + 1, last_message_at = NEW.created_at
    WHERE id = v_lead_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION create_message_activity();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify migration succeeded:

-- Check conversations were created
-- SELECT COUNT(*) FROM public.conversations;

-- Check messages were migrated
-- SELECT COUNT(*) FROM public.messages;

-- Check a sample lead with messages
-- SELECT l.name, COUNT(m.id) as message_count
-- FROM public.leads l
-- JOIN public.conversations c ON c.lead_id = l.id
-- JOIN public.messages m ON m.conversation_id = c.id
-- GROUP BY l.id, l.name;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
