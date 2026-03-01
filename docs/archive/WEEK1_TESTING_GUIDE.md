# Week 1 Testing Guide - Authentication & Setup

This guide will help you test all the features implemented during Week 1 of the Frontend Dashboard implementation.

## ✅ Completed Features (Week 1)

### Day 1: Project Setup
- [x] Next.js 14 with TypeScript
- [x] Tailwind CSS configuration
- [x] shadcn/ui component library
- [x] Project structure

### Day 2: Database Schema
- [x] Database migrations run
- [x] Users table created
- [x] Audit logs table
- [x] Training examples table
- [x] Prompt versions table
- [x] Notifications table
- [x] Row Level Security (RLS) policies

### Day 3: Supabase Auth Setup
- [x] Supabase client configuration
- [x] Server and client-side auth
- [x] Environment variables configured
- [x] Admin user created

### Day 4: Login Page & Middleware
- [x] Login page with email/password
- [x] Password visibility toggle
- [x] Error handling
- [x] Authentication middleware
- [x] Role-based route protection
- [x] Inactive user check
- [x] Login redirect handling

### Day 5: Auth Context & Permissions
- [x] AuthContext with user state
- [x] useAuth hook
- [x] Permission checker utility
- [x] Role-based hooks (useIsAdmin, useIsManager, etc.)
- [x] hasPermission function
- [x] Dashboard personalization

---

## 🧪 Testing Checklist

### 1. Login & Authentication

#### Test 1.1: Login with Valid Credentials
**Steps:**
1. Navigate to http://localhost:3000
2. You should be redirected to `/login?redirect=/`
3. Enter your email: `sergiu@iterio.ro`
4. Enter your password
5. Click "Sign In"

**Expected Results:**
- ✅ Should redirect to `/dashboard`
- ✅ Dashboard shows "Welcome back, Sergiu Castrase!"
- ✅ Role badge shows "Admin" in red

#### Test 1.2: Login with Invalid Credentials
**Steps:**
1. Sign out (if logged in)
2. Go to http://localhost:3000/login
3. Enter incorrect email or password
4. Click "Sign In"

**Expected Results:**
- ✅ Error message appears: "Failed to sign in. Please check your credentials."
- ✅ User stays on login page
- ✅ No redirect occurs

#### Test 1.3: Inactive User Check
**Steps:**
1. In Supabase SQL Editor, run:
   ```sql
   UPDATE users SET is_active = false WHERE email = 'sergiu@iterio.ro';
   ```
2. Try to access http://localhost:3000/dashboard
3. After testing, restore: `UPDATE users SET is_active = true WHERE email = 'sergiu@iterio.ro';`

**Expected Results:**
- ✅ User is signed out automatically
- ✅ Redirected to `/login?error=Account is disabled or not found`
- ✅ Error message displayed on login page

---

### 2. Middleware Protection

#### Test 2.1: Protected Routes Without Auth
**Steps:**
1. Sign out completely (clear cookies if needed)
2. Try to access these URLs directly:
   - http://localhost:3000/dashboard
   - http://localhost:3000/dashboard/admin
   - http://localhost:3000/dashboard/settings

**Expected Results:**
- ✅ All redirect to `/login?redirect=<original-path>`
- ✅ No dashboard content is visible

#### Test 2.2: Login Redirect to Original Page
**Steps:**
1. Sign out
2. Try to access http://localhost:3000/dashboard/settings
3. You'll be redirected to `/login?redirect=/dashboard/settings`
4. Sign in with valid credentials

**Expected Results:**
- ✅ After login, redirects to `/dashboard/settings`
- ✅ If page doesn't exist (404), shows Next.js not found page

#### Test 2.3: Logged-in User Accessing Login Page
**Steps:**
1. Sign in successfully
2. Try to access http://localhost:3000/login

**Expected Results:**
- ✅ Automatically redirects to `/dashboard`
- ✅ Login page is not shown

#### Test 2.4: Public Routes (No Auth Required)
**Steps:**
1. Sign out
2. Try to access:
   - http://localhost:3000/api/health (if exists)
   - http://localhost:3000/api/webhook/manychat

**Expected Results:**
- ✅ No redirect to login
- ✅ Routes are accessible without authentication

---

### 3. Role-Based Access Control

#### Test 3.1: Admin Route Protection
**Steps:**
1. Create a test user with "viewer" role in Supabase:
   ```sql
   -- First create auth user in Supabase Auth UI
   -- Then insert into users table:
   INSERT INTO users (id, email, full_name, role, is_active)
   VALUES ('uuid-from-auth', 'viewer@test.com', 'Test Viewer', 'viewer', true);
   ```
2. Sign in as the viewer user
3. Try to access http://localhost:3000/dashboard/admin

**Expected Results:**
- ✅ Redirected to `/dashboard?error=Access denied. Admin privileges required.`
- ✅ Error message displayed on dashboard

#### Test 3.2: Manager Route Protection
**Steps:**
1. Sign in as operator or viewer
2. Try to access http://localhost:3000/dashboard/training/approve

**Expected Results:**
- ✅ Redirected to `/dashboard?error=Access denied. Manager privileges required.`
- ✅ Only admin and manager can access

---

### 4. Auth Context & State Management

#### Test 4.1: User Profile Display
**Steps:**
1. Sign in as admin
2. Check the dashboard page at http://localhost:3000/dashboard

**Expected Results:**
- ✅ Header shows: "Welcome back, Sergiu Castrase!"
- ✅ Role badge displays "Admin" with red background
- ✅ User information loads correctly

#### Test 4.2: Loading State
**Steps:**
1. Open browser DevTools > Network tab
2. Throttle network to "Slow 3G"
3. Refresh the dashboard page

**Expected Results:**
- ✅ Loading skeleton appears briefly
- ✅ Shows animated placeholder for header
- ✅ Then user info loads

#### Test 4.3: Sign Out
**Steps:**
1. Sign in to dashboard
2. Add a temporary sign out button to test (or use browser console):
   ```javascript
   // In browser console:
   const { signOut } = useAuth()
   await signOut()
   ```

**Expected Results:**
- ✅ User is signed out
- ✅ Redirected to login page
- ✅ Cannot access dashboard anymore

---

### 5. Permission System

#### Test 5.1: Permission Checker
**Steps:**
1. Open browser console while logged in as admin
2. Test permission checker:
   ```javascript
   // Should work in component:
   const { hasPermission } = useAuth()
   console.log(hasPermission('view:admin')) // true for admin
   console.log(hasPermission('manage:users')) // true for admin
   ```

**Expected Results:**
- ✅ Admin has all permissions
- ✅ hasPermission returns correct boolean values

#### Test 5.2: Role Helper Hooks
**Steps:**
1. In a component, test the role hooks:
   ```typescript
   const isAdmin = useIsAdmin()        // true for admin
   const isManager = useIsManager()    // true for admin/manager
   const isOperator = useIsOperator()  // true for admin/manager/operator
   ```

**Expected Results:**
- ✅ Hooks return correct boolean based on role
- ✅ Admin passes all role checks

---

### 6. Browser Testing

#### Test 6.1: Cross-Browser Compatibility
Test in multiple browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari

**Expected Results:**
- ✅ Login works in all browsers
- ✅ Redirects work correctly
- ✅ UI renders properly

#### Test 6.2: Responsive Design
**Steps:**
1. Open DevTools > Device toolbar
2. Test at different screen sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)

**Expected Results:**
- ✅ Login page is responsive
- ✅ Dashboard adapts to screen size
- ✅ No horizontal scroll
- ✅ All elements are readable

---

### 7. Security Testing

#### Test 7.1: Session Persistence
**Steps:**
1. Sign in
2. Refresh the page
3. Close tab and reopen http://localhost:3000/dashboard

**Expected Results:**
- ✅ User stays logged in after refresh
- ✅ Session persists across tabs
- ✅ User info loads correctly

#### Test 7.2: SQL Injection Prevention
**Steps:**
1. Try entering SQL in login form:
   - Email: `admin' OR '1'='1`
   - Password: `' OR '1'='1`

**Expected Results:**
- ✅ Login fails with invalid credentials
- ✅ No SQL injection vulnerability
- ✅ Supabase handles sanitization

#### Test 7.3: RLS Policy Verification
**Steps:**
1. In Supabase SQL Editor, verify policies:
   ```sql
   SELECT * FROM users; -- Should work for admin
   ```
2. Try accessing data via browser console (as viewer):
   ```javascript
   const { data } = await supabase.from('users').select('*')
   // Should only see own profile
   ```

**Expected Results:**
- ✅ RLS policies are enforced
- ✅ Users can only see permitted data
- ✅ Admin can see all users

---

## 🐛 Common Issues & Solutions

### Issue 1: "Account is disabled or not found"
**Solution:**
- Check user exists in `users` table (not just `auth.users`)
- Verify `is_active = true`
- Ensure UUID matches between tables
- Run the verification query in `verify-admin-setup.sql`

### Issue 2: Infinite Recursion Error
**Solution:**
- RLS policies were fixed with `public.get_user_role()` function
- If issue persists, run `fix-rls-policies.sql` again

### Issue 3: "Cannot find module './vendor-chunks/@supabase.js'"
**Solution:**
- Clear build cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

### Issue 4: Redirect Loop
**Solution:**
- Clear browser cookies for localhost:3000
- Check middleware is not conflicting
- Verify public routes array in `src/lib/supabase/middleware.ts`

### Issue 5: TypeScript Errors
**Solution:**
- Check `src/types/database.types.ts` exists
- Run `npm run build` to see all errors
- Ensure all imports are correct

---

## 📊 Week 1 Summary

### Files Created/Modified
1. **Authentication:**
   - `src/app/login/page.tsx` - Login page
   - `src/contexts/AuthContext.tsx` - Auth state management
   - `src/lib/supabase/client.ts` - Supabase client
   - `src/lib/supabase/middleware.ts` - Auth middleware
   - `src/middleware.ts` - Next.js middleware

2. **Permissions:**
   - `src/lib/permissions.ts` - Permission checker utility

3. **Database:**
   - `supabase-migration.sql` - Base schema
   - `supabase-dashboard-migration.sql` - Dashboard schema
   - `fix-rls-policies.sql` - RLS policy fixes

4. **Dashboard:**
   - `src/app/dashboard/page.tsx` - Dashboard overview
   - `src/app/layout.tsx` - Root layout with AuthProvider

5. **Types:**
   - `src/types/database.types.ts` - TypeScript types
   - `src/types/supabase.ts` - Supabase types

### Key Features Working
- ✅ User authentication with Supabase
- ✅ Role-based access control (Admin, Manager, Operator, Viewer)
- ✅ Protected routes with middleware
- ✅ Inactive user detection
- ✅ Permission system with granular controls
- ✅ Auth context with hooks
- ✅ Login redirect handling
- ✅ Session management
- ✅ User profile display
- ✅ Loading states

---

## 🎯 Next Steps (Week 2)

After confirming all Week 1 tests pass:

1. **Day 1:** Dashboard layout with Sidebar and TopBar
2. **Day 2:** Overview page with stats cards
3. **Day 3:** Charts and needs attention section
4. **Day 4:** User settings page
5. **Day 5:** Dark mode and theme switching

---

## 📝 Test Results Template

Copy this template and fill in your test results:

```
# Week 1 Test Results - [Date]

## 1. Login & Authentication
- [ ] Test 1.1: Login with valid credentials
- [ ] Test 1.2: Login with invalid credentials
- [ ] Test 1.3: Inactive user check

## 2. Middleware Protection
- [ ] Test 2.1: Protected routes without auth
- [ ] Test 2.2: Login redirect to original page
- [ ] Test 2.3: Logged-in user accessing login page
- [ ] Test 2.4: Public routes

## 3. Role-Based Access Control
- [ ] Test 3.1: Admin route protection
- [ ] Test 3.2: Manager route protection

## 4. Auth Context & State Management
- [ ] Test 4.1: User profile display
- [ ] Test 4.2: Loading state
- [ ] Test 4.3: Sign out

## 5. Permission System
- [ ] Test 5.1: Permission checker
- [ ] Test 5.2: Role helper hooks

## 6. Browser Testing
- [ ] Test 6.1: Cross-browser compatibility
- [ ] Test 6.2: Responsive design

## 7. Security Testing
- [ ] Test 7.1: Session persistence
- [ ] Test 7.2: SQL injection prevention
- [ ] Test 7.3: RLS policy verification

## Issues Found:
[List any issues here]

## Notes:
[Additional notes]
```

---

## ✅ Ready for Production?

Before moving to Week 2, ensure:
- [ ] All tests above pass
- [ ] No console errors in browser
- [ ] No TypeScript errors in build
- [ ] RLS policies are working correctly
- [ ] Admin user can access dashboard
- [ ] Login redirects work properly
- [ ] Session persists correctly
