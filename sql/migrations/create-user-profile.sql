-- Create user profile in users table
-- Run this in Supabase SQL Editor
-- Replace the values below with your actual user information

-- First, find your user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then, create the profile (replace YOUR_USER_ID with the UUID from above)
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with UUID from auth.users
  'your-email@example.com',  -- Replace with your email
  'Your Full Name',  -- Replace with your name
  'admin',  -- or 'manager', 'operator', 'viewer'
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = NOW();

-- Verify the user was created
SELECT id, email, full_name, role, is_active FROM users WHERE email = 'your-email@example.com';
