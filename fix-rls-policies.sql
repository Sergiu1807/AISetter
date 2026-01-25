-- Fix RLS Policies - Remove Infinite Recursion
-- Run this in Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Create a function to check user role (cached, non-recursive)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Now create non-recursive policies using the function

-- SELECT: Users can view themselves, admins can view all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    public.get_user_role() = 'admin'
  );

-- INSERT: Only admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
  );

-- UPDATE: Users can update themselves, admins can update all
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    id = auth.uid()
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
  );

-- DELETE: Only admins can delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    public.get_user_role() = 'admin'
  );

-- Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
