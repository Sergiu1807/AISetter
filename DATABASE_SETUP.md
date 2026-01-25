# Database Setup Guide

This guide will help you set up the database for the AI Appointment Setter Dashboard.

## Prerequisites

- A Supabase project (https://supabase.com)
- Access to the Supabase SQL Editor
- Your Supabase project URL and anon/service keys

## Migration Files

We have two migration files that need to be run in order:

1. **`supabase-migration.sql`** - Base schema (leads table)
2. **`supabase-dashboard-migration.sql`** - Dashboard schema (users, audit logs, etc.)

## Step-by-Step Setup

### Step 1: Run Base Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-migration.sql`
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Verify you see "Migration completed successfully!"

### Step 2: Run Dashboard Migration

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `supabase-dashboard-migration.sql`
3. Click **Run**
4. Verify you see "Dashboard migration completed successfully!"
5. Check the summary table showing all tables have been created

### Step 3: Create Your First Admin User

After running the migrations, you need to create your first admin user:

1. Go to **Authentication** > **Users** in Supabase
2. Click **Add User** > **Create new user**
3. Enter email and password
4. Click **Create user**
5. Copy the user's UUID

6. In SQL Editor, run this query (replace the UUID and details):

```sql
INSERT INTO users (id, email, full_name, role)
VALUES (
  'd84553ee-07bf-4a45-a709-ae5812bf5621',
  'sergiu@iterio.ro',
  'Sergiu Castrase',
  'admin'
);
```

### Step 4: Configure Environment Variables

Update your `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Schema Overview

### Core Tables

#### `users`
- Stores dashboard users (admin, manager, operator, viewer)
- Extends Supabase auth.users
- Includes preferences and role-based access control

#### `leads`
- Main leads/contacts table
- Stores conversation history, status, and metadata
- Enhanced with dashboard fields (assignment, tags, priority, rating)

#### `audit_logs`
- Tracks all user actions for security and compliance
- Includes IP address, user agent, and action details

#### `training_examples`
- Stores conversation examples for AI training
- Supports approval workflow
- Tracks good/bad/correction examples

#### `prompt_versions`
- Manages AI prompt versions
- Tracks performance metrics per version
- Ensures only one active prompt at a time

#### `notifications`
- User notifications for important events
- Supports different notification types
- Tracks read/unread status

### Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:

- **Admin**: Full access to everything
- **Manager**: Can manage most resources, view audit logs
- **Operator**: Can manage leads, submit training examples
- **Viewer**: Read-only access to most resources

### Helper Functions

#### `log_audit_event()`
Logs an audit event:
```sql
SELECT log_audit_event(
  'user_updated',
  'users',
  user_id,
  '{"field": "role", "old": "viewer", "new": "operator"}'::jsonb
);
```

#### `create_notification()`
Creates a notification for a user:
```sql
SELECT create_notification(
  user_id,
  'needs_human',
  'Human intervention needed',
  'Lead John Doe requires manual response',
  '/dashboard/leads/123'
);
```

## Indexes

All tables have appropriate indexes for:
- Unique constraints (email, manychat_user_id)
- Foreign keys
- Frequently queried fields (status, role, created_at)
- Partial indexes for boolean flags (is_active, needs_human)
- GIN indexes for array fields (tags, steps_completed)

## Triggers

Auto-update triggers for `updated_at` columns:
- `users`
- `leads`
- `training_examples`
- `prompt_versions`

## Verification

After running migrations, verify everything is set up correctly:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'leads', 'audit_logs', 'training_examples', 'prompt_versions', 'notifications');

-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Troubleshooting

### Issue: "relation already exists"
Some tables may already exist from previous migrations. The migration uses `IF NOT EXISTS` to handle this gracefully.

### Issue: RLS blocking queries
Make sure you're authenticated with a user that exists in the `users` table. The webhook endpoint should use the service role key to bypass RLS.

### Issue: Cannot create first admin user
The admin user creation requires bypassing RLS. Use the service role key or run the INSERT directly in the SQL Editor (which uses service role).

## Next Steps

After setting up the database:

1. Test authentication by logging in with your admin user
2. Explore the dashboard at `/dashboard`
3. Create additional users via the admin panel
4. Configure Supabase Realtime for live updates (Week 5, Day 1)

## Backup & Restore

### Export schema
```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -W -d postgres --schema-only > schema.sql
```

### Export data
```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -W -d postgres --data-only > data.sql
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
