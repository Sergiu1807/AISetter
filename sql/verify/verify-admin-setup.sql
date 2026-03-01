-- Run this in Supabase SQL Editor to verify your admin user setup
-- This uses service role privileges to bypass RLS

-- 1. Check if auth user exists
SELECT
  'Auth Users' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'sergiu@iterio.ro';

-- 2. Check if user exists in users table
SELECT
  'Users Table' as table_name,
  id,
  email,
  full_name,
  role,
  is_active,
  last_login_at,
  created_at
FROM users
WHERE email = 'sergiu@iterio.ro';

-- 3. If user doesn't exist in users table, create it
-- Replace YOUR_UUID_HERE with the UUID from auth.users query above
-- Uncomment and run this if the user doesn't exist:

/*
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
  'YOUR_UUID_HERE',  -- Replace with UUID from auth.users
  'sergiu@iterio.ro',
  'Sergiu Castrase',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  is_active = true,
  role = 'admin';
*/

-- 4. Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
