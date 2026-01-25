-- Full Database Schema for AI Appointment Setter
-- Run this in Supabase SQL Editor after the initial setup

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    manychat_user_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'exploring', 'likely_qualified', 'qualified', 'not_fit', 'nurture', 'booked')),
    current_phase TEXT NOT NULL DEFAULT 'P1' CHECK (current_phase IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7')),
    message_count INTEGER DEFAULT 0,
    assigned_to UUID REFERENCES public.users(id),
    tags TEXT[] DEFAULT '{}',
    needs_human BOOLEAN DEFAULT false,
    bot_paused BOOLEAN DEFAULT false,
    has_errors BOOLEAN DEFAULT false,
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phase ON public.leads(current_phase);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_manychat_user_id ON public.leads(manychat_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_needs_human ON public.leads(needs_human) WHERE needs_human = true;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Users can view leads they have access to" ON public.leads
    FOR SELECT USING (
        CASE
            WHEN public.get_user_role() = 'admin' THEN true
            WHEN public.get_user_role() = 'manager' THEN true
            WHEN public.get_user_role() = 'operator' THEN assigned_to = auth.uid()
            ELSE false
        END
    );

CREATE POLICY "Users can update leads based on role" ON public.leads
    FOR UPDATE USING (
        CASE
            WHEN public.get_user_role() = 'admin' THEN true
            WHEN public.get_user_role() = 'manager' THEN true
            WHEN public.get_user_role() = 'operator' THEN assigned_to = auth.uid()
            ELSE false
        END
    );

CREATE POLICY "Admins and managers can insert leads" ON public.leads
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'manager')
    );

-- ============================================================================
-- CONVERSATIONS TABLE
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

CREATE POLICY "Users can update conversations for accessible leads" ON public.conversations
    FOR UPDATE USING (
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
-- MESSAGES TABLE
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
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

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

CREATE POLICY "Users can insert messages for accessible conversations" ON public.messages
    FOR INSERT WITH CHECK (
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
-- TRAINING EXAMPLES TABLE
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_training_examples_rating ON public.training_examples(rating);
CREATE INDEX IF NOT EXISTS idx_training_examples_lead_type ON public.training_examples(lead_type);

ALTER TABLE public.training_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage training examples" ON public.training_examples
    FOR ALL USING (
        public.get_user_role() IN ('admin', 'manager')
    );

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
    FOR ALL USING (
        public.get_user_role() = 'admin'
    );

CREATE POLICY "All users can read system settings" ON public.system_settings
    FOR SELECT USING (true);

-- ============================================================================
-- KNOWLEDGE BASE TABLE
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

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_is_active ON public.knowledge_base(is_active);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage knowledge base" ON public.knowledge_base
    FOR ALL USING (
        public.get_user_role() IN ('admin', 'manager')
    );

-- ============================================================================
-- RESPONSE TEMPLATES TABLE
-- ============================================================================
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

ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage templates" ON public.response_templates
    FOR ALL USING (
        public.get_user_role() IN ('admin', 'manager')
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_examples_updated_at BEFORE UPDATE ON public.training_examples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON public.response_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create activity on lead status change
CREATE OR REPLACE FUNCTION create_status_change_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.activities (
            type,
            lead_id,
            title,
            description,
            metadata
        ) VALUES (
            CASE
                WHEN NEW.status = 'qualified' THEN 'lead_qualified'
                WHEN NEW.status = 'not_fit' THEN 'lead_disqualified'
                WHEN NEW.status = 'booked' THEN 'call_booked'
                ELSE 'phase_change'
            END,
            NEW.id,
            'Status Changed',
            NEW.name || ' status changed from ' || OLD.status || ' to ' || NEW.status,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;

    IF OLD.current_phase IS DISTINCT FROM NEW.current_phase THEN
        INSERT INTO public.activities (
            type,
            lead_id,
            title,
            description,
            metadata
        ) VALUES (
            'phase_change',
            NEW.id,
            'Phase Changed',
            NEW.name || ' moved from ' || OLD.current_phase || ' to ' || NEW.current_phase,
            jsonb_build_object(
                'phase_from', OLD.current_phase,
                'phase_to', NEW.current_phase
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_change AFTER UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION create_status_change_activity();

-- Function to create activity on new message
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id UUID;
    v_lead_name TEXT;
    v_lead_handle TEXT;
BEGIN
    -- Get lead info
    SELECT l.id, l.name, l.handle INTO v_lead_id, v_lead_name, v_lead_handle
    FROM public.conversations c
    JOIN public.leads l ON l.id = c.lead_id
    WHERE c.id = NEW.conversation_id;

    -- Create activity
    INSERT INTO public.activities (
        type,
        lead_id,
        user_id,
        title,
        description,
        metadata
    ) VALUES (
        CASE
            WHEN NEW.sender_type = 'lead' THEN 'message_received'
            ELSE 'message_sent'
        END,
        v_lead_id,
        NEW.sender_id,
        CASE
            WHEN NEW.sender_type = 'lead' THEN 'Message Received'
            ELSE 'Message Sent'
        END,
        v_lead_name || ': "' || LEFT(NEW.content, 100) || '"',
        jsonb_build_object(
            'sender_type', NEW.sender_type,
            'message_preview', LEFT(NEW.content, 200)
        )
    );

    -- Update lead message count and last message time
    UPDATE public.leads
    SET
        message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = v_lead_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION create_message_activity();

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Insert system settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('bot_auto_response', 'true', 'Enable automatic bot responses'),
    ('human_handoff_enabled', 'true', 'Allow automatic handoff to humans'),
    ('working_hours', '"9:00 AM - 6:00 PM"', 'Business working hours'),
    ('timezone', '"Europe/Bucharest"', 'System timezone'),
    ('max_concurrent_conversations', '50', 'Maximum concurrent conversations'),
    ('response_delay', '2', 'Delay before bot responds (seconds)')
ON CONFLICT (key) DO NOTHING;

-- Insert knowledge base entries
INSERT INTO public.knowledge_base (category, title, content) VALUES
    ('company', 'Company Overview', 'We help businesses automate their lead qualification and appointment setting through AI-powered conversation bots on Instagram, Facebook, and websites.'),
    ('services', 'Services & Pricing', E'Starter: $497/mo - Up to 500 conversations\nPro: $997/mo - Up to 2000 conversations\nEnterprise: Custom pricing - Unlimited conversations'),
    ('qualifying_questions', 'Qualifying Questions', E'1. What type of business do you run?\n2. How many leads do you get per month?\n3. What''s your current follow-up process?\n4. What''s your budget for automation?\n5. When are you looking to start?')
ON CONFLICT DO NOTHING;

-- Insert response templates
INSERT INTO public.response_templates (name, trigger, content) VALUES
    ('Initial Greeting', 'first_message', 'Hi [Name]! 👋 Thanks for reaching out. I''m here to help you learn about our AI appointment setting solutions. What brings you here today?'),
    ('Pricing Question', 'pricing', 'Great question! Our pricing depends on your specific needs and volume. Would you be open to a quick 15-minute call where I can understand your business better and give you exact pricing?'),
    ('Not Ready Now', 'not_ready', 'No worries at all! I completely understand. Would it be helpful if I follow up in [timeframe]? Or I can just send you some resources you can check out when you''re ready?')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Run this entire file in Supabase SQL Editor
-- All tables, indexes, RLS policies, functions, and triggers are now set up
