# AI Appointment Setter - Frontend Dashboard Plan

## Document Version & Context

**Version:** 3.0 (Complete Edition)  
**Last Updated:** January 2026  
**Purpose:** Ultra-detailed guide for building the complete monitoring dashboard  
**Target:** Claude Code implementation, step-by-step  
**Estimated Development:** 8-10 weeks

---

## Executive Summary

This dashboard enables real-time monitoring, human intervention, team collaboration, and continuous improvement of the AI appointment setting agent for Vlad Gogoanta's eCommerce coaching business.

**Primary Users:** 
- Sergiu (Admin) - Full access, user management
- Team Members (Operators) - Monitoring, intervention, limited settings
- Vlad (Viewer/Manager) - Overview, analytics, no technical access

**Core Value:** Transform the agent from "set and forget" to "team-managed, continuously optimized"

---

## Table of Contents

1. [Current Application Architecture](#part-1-current-application-architecture)
2. [Authentication & Authorization](#part-2-authentication--authorization)
3. [Admin Panel](#part-3-admin-panel)
4. [Core Dashboard Pages](#part-4-core-dashboard-pages)
5. [Analytics & Insights](#part-5-analytics--insights)
6. [Training & Optimization](#part-6-training--optimization)
7. [System Management](#part-7-system-management)
8. [Advanced Features](#part-8-advanced-features)
9. [Technical Implementation](#part-9-technical-implementation)
10. [Implementation Roadmap](#part-10-implementation-roadmap)
11. [UI/UX Guidelines](#part-11-uiux-guidelines)

---

## Part 1: Current Application Architecture

### Tech Stack (Already Implemented)
```
├── Framework: Next.js 14+ (App Router)
├── Language: TypeScript (strict mode)
├── Database: Supabase (PostgreSQL)
├── AI: Anthropic Claude API (claude-sonnet-4-5-20250929) with Prompt Caching
├── Deployment: Vercel
├── External: ManyChat API for Instagram DM integration
```

### Existing Database Schema (`leads` table)
```sql
leads (
  id UUID PRIMARY KEY,
  manychat_user_id TEXT UNIQUE NOT NULL,
  instagram_handle TEXT,
  name TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  
  lead_source TEXT DEFAULT 'dm_direct',
  initial_engagement TEXT,
  known_details TEXT,
  
  conversation_phase TEXT DEFAULT 'P1',
  qualification_status TEXT DEFAULT 'new',
  
  collected_data JSONB DEFAULT '{}',
  steps_completed TEXT[] DEFAULT '{}',
  
  is_new BOOLEAN DEFAULT true,
  is_returning BOOLEAN DEFAULT false,
  bot_paused BOOLEAN DEFAULT false,
  needs_human BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  
  call_booked BOOLEAN DEFAULT false,
  call_date TIMESTAMPTZ,
  final_status TEXT DEFAULT 'in_progress',
  
  messages JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  
  last_ai_analysis TEXT,
  error_count INTEGER DEFAULT 0,
  notes TEXT
)
```

### Message Structure (in `messages` JSONB array)
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  analysis?: string;
  meta?: {
    qualification_status?: string;
    conversation_phase?: string;
    pain_points?: string;
    objections?: string;
    steps_completed?: string;
    next_goal?: string;
    risk_factors?: string;
    red_flags?: string;
  };
  // NEW: Track human interventions
  sent_by?: string;        // user_id if sent by human
  is_human?: boolean;      // true if sent by team member, not bot
}
```

---

## Part 2: Authentication & Authorization

### 2.1 Overview

**Authentication Model:**
- **No public registration** - Admin creates all accounts
- **Email + Password** login via Supabase Auth
- **Session-based** authentication with JWT
- **Password reset** via admin or email link

**Authorization Model:**
- **Role-Based Access Control (RBAC)**
- **4 distinct roles** with granular permissions
- **Row-Level Security (RLS)** in Supabase

### 2.2 User Roles & Permissions

```typescript
enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}
```

#### Permission Matrix

| Permission | Admin | Manager | Operator | Viewer |
|------------|-------|---------|----------|--------|
| **DASHBOARD** |
| View Overview | ✅ | ✅ | ✅ | ✅ |
| View Live Feed | ✅ | ✅ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ❌ | ❌ |
| **LEADS** |
| View All Leads | ✅ | ✅ | ✅ | ✅ |
| View Assigned Only | - | - | Optional | Optional |
| View Conversation | ✅ | ✅ | ✅ | ✅ |
| View AI Analysis | ✅ | ✅ | ✅ | ❌ |
| Edit Lead Info | ✅ | ✅ | ✅ | ❌ |
| Add Notes | ✅ | ✅ | ✅ | ❌ |
| Add Tags | ✅ | ✅ | ✅ | ❌ |
| **BOT CONTROL** |
| Pause/Resume Bot | ✅ | ✅ | ✅ | ❌ |
| Take Over Conversation | ✅ | ✅ | ✅ | ❌ |
| Send Manual Message | ✅ | ✅ | ✅ | ❌ |
| Block Lead | ✅ | ✅ | ❌ | ❌ |
| Delete Lead | ✅ | ❌ | ❌ | ❌ |
| **TRAINING** |
| View Training Center | ✅ | ✅ | ✅ | ❌ |
| Rate Conversations | ✅ | ✅ | ✅ | ❌ |
| Submit Examples | ✅ | ✅ | ✅ | ❌ |
| Approve Examples | ✅ | ✅ | ❌ | ❌ |
| Edit Prompt | ✅ | ❌ | ❌ | ❌ |
| Deploy Prompt | ✅ | ❌ | ❌ | ❌ |
| **SETTINGS** |
| View Settings | ✅ | ✅ | ❌ | ❌ |
| Edit Bot Settings | ✅ | ❌ | ❌ | ❌ |
| Edit Notifications | ✅ | ✅ | Own only | ❌ |
| **ADMIN** |
| Access Admin Panel | ✅ | ❌ | ❌ | ❌ |
| Create Users | ✅ | ❌ | ❌ | ❌ |
| Edit Users | ✅ | ❌ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ | ❌ |
| View Audit Log | ✅ | ✅ | ❌ | ❌ |
| View System Logs | ✅ | ❌ | ❌ | ❌ |
| Manage Integrations | ✅ | ❌ | ❌ | ❌ |

### 2.3 Database Schema for Auth

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
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

-- Row Level Security
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

-- Only admins can insert/update/delete users
CREATE POLICY "Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

### 2.4 Login Page

**Route:** `/login`  
**Access:** Public (unauthenticated only)

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                                                                                  │
│                    ┌─────────────────────────────────────┐                      │
│                    │                                     │                      │
│                    │         🤖 AI Appointment          │                      │
│                    │              Setter                 │                      │
│                    │                                     │                      │
│                    │  ┌─────────────────────────────┐   │                      │
│                    │  │ Email                       │   │                      │
│                    │  │ sergiu@example.com          │   │                      │
│                    │  └─────────────────────────────┘   │                      │
│                    │                                     │                      │
│                    │  ┌─────────────────────────────┐   │                      │
│                    │  │ Password                    │   │                      │
│                    │  │ ••••••••••••           👁   │   │                      │
│                    │  └─────────────────────────────┘   │                      │
│                    │                                     │                      │
│                    │  ☐ Remember me                      │                      │
│                    │                                     │                      │
│                    │  ┌─────────────────────────────┐   │                      │
│                    │  │         Sign In             │   │                      │
│                    │  └─────────────────────────────┘   │                      │
│                    │                                     │                      │
│                    │  Forgot password? Contact admin    │                      │
│                    │                                     │                      │
│                    └─────────────────────────────────────┘                      │
│                                                                                  │
│                          © 2026 Vlad Gogoanta                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is active
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_active, role')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData?.is_active) {
        await supabase.auth.signOut();
        throw new Error('Account is disabled. Contact administrator.');
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      // Redirect based on role
      if (userData.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">🤖 AI Appointment Setter</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <Alert variant="destructive">{error}</Alert>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Forgot password? Contact your administrator
          </p>
        </form>
      </div>
    </div>
  );
}
```

### 2.5 Middleware Protection

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const pathname = req.nextUrl.pathname;
  
  // Public routes
  const publicRoutes = ['/login', '/api/webhook/manychat', '/api/health'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If logged in and trying to access login, redirect to dashboard
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }
  
  // Protected routes - require authentication
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Admin-only routes
  const adminRoutes = ['/dashboard/admin'];
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2.6 Auth Context & Hooks

```typescript
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User extends SupabaseUser {
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  full_name: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    browser: boolean;
    email: boolean;
    sound: boolean;
  };
  dashboard: {
    default_page: string;
    items_per_page: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userData) {
          setUser({ ...session.user, ...userData } as User);
        }
      }
      
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (userData) {
            setUser({ ...session.user, ...userData } as User);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return checkPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Permission checker
function checkPermission(role: string, permission: string): boolean {
  const permissions: Record<string, string[]> = {
    admin: ['*'], // All permissions
    manager: [
      'view:dashboard', 'view:leads', 'view:analytics', 'view:training',
      'edit:leads', 'control:bot', 'takeover:conversation', 'send:message',
      'block:lead', 'rate:conversation', 'submit:example', 'approve:example',
      'view:settings', 'edit:notifications', 'view:audit', 'export:data'
    ],
    operator: [
      'view:dashboard', 'view:leads', 'view:analytics', 'view:training',
      'edit:leads', 'control:bot', 'takeover:conversation', 'send:message',
      'rate:conversation', 'submit:example'
    ],
    viewer: [
      'view:dashboard', 'view:leads', 'view:analytics'
    ]
  };

  if (permissions[role]?.includes('*')) return true;
  return permissions[role]?.includes(permission) ?? false;
}
```

---

## Part 3: Admin Panel

### 3.1 Overview

**Route:** `/dashboard/admin`  
**Access:** Admin only

**Features:**
- User Management (CRUD)
- Role Management
- System Settings
- Audit Log
- API Keys Management
- System Health

### 3.2 Admin Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔐 ADMIN PANEL                                              [Back to Dashboard] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Users] [Roles] [System] [Audit Log] [API Keys] [Health]                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 User Management

**Route:** `/dashboard/admin/users`

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  👥 USER MANAGEMENT                                         [+ Create User]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🔍 [Search users..._______________]                                            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ USER               │ EMAIL              │ ROLE     │ STATUS │ LAST LOGIN│   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Sergiu Admin    │ sergiu@...         │ 🔴 Admin │ Active │ 2 min ago │   │
│  │                    │                    │          │        │ [Edit]    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Maria Operator  │ maria@...          │ 🟢 Operator│ Active │ 1h ago   │   │
│  │                    │                    │          │        │ [Edit]    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Vlad Manager    │ vlad@...           │ 🔵 Manager│ Active │ 2d ago   │   │
│  │                    │                    │          │        │ [Edit]    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 👤 Test User       │ test@...           │ 🟡 Viewer│ Disabled│ Never    │   │
│  │                    │                    │          │        │ [Edit]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Total: 4 users │ Active: 3 │ Disabled: 1                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Create/Edit User Modal
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE NEW USER                                                    [X Close]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Full Name *                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Maria Popescu                                                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Email *                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ maria@example.com                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Role *                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Operator                                                             ▼  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Temporary Password *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ••••••••••••                                              [Generate]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│  ☑ Require password change on first login                                       │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  PERMISSIONS OVERVIEW                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ View Dashboard, Leads, Analytics                                      │   │
│  │ ✅ Edit Leads, Add Notes, Tags                                           │   │
│  │ ✅ Pause/Resume Bot, Take Over, Send Messages                            │   │
│  │ ✅ Rate Conversations, Submit Examples                                   │   │
│  │ ❌ Approve Examples, Edit Prompts                                        │   │
│  │ ❌ Access Admin Panel, System Settings                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Cancel]                                               [Create User]           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### API Implementation

```typescript
// POST /api/admin/users - Create user
async function POST(request: Request) {
  const { user } = await getServerSession();
  
  // Verify admin
  const { data: adminUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (adminUser?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { email, full_name, role, password } = await request.json();
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }
  
  // Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name,
      role,
      created_by: user.id
    })
    .select()
    .single();
  
  if (userError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return Response.json({ error: userError.message }, { status: 400 });
  }
  
  // Log action
  await logAuditEvent({
    user_id: user.id,
    action: 'user_created',
    target_type: 'user',
    target_id: userData.id,
    details: { email, role }
  });
  
  return Response.json({ user: userData });
}

// PATCH /api/admin/users/[id] - Update user
async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getServerSession();
  
  // Verify admin
  const { data: adminUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (adminUser?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const updates = await request.json();
  
  // Prevent admin from demoting themselves
  if (params.id === user.id && updates.role && updates.role !== 'admin') {
    return Response.json({ error: 'Cannot change your own role' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();
  
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  
  // Log action
  await logAuditEvent({
    user_id: user.id,
    action: 'user_updated',
    target_type: 'user',
    target_id: params.id,
    details: updates
  });
  
  return Response.json({ user: data });
}

// DELETE /api/admin/users/[id] - Disable user (soft delete)
async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // ... similar pattern, set is_active = false
}
```

### 3.4 Audit Log

**Route:** `/dashboard/admin/audit`

#### Database Schema

```sql
-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,                    -- Denormalized for history
  action TEXT NOT NULL,               -- 'user_created', 'lead_paused', 'message_sent', etc.
  target_type TEXT,                   -- 'user', 'lead', 'setting', etc.
  target_id TEXT,                     -- ID of affected resource
  details JSONB,                      -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view audit log
CREATE POLICY "Admins and managers can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
```

#### Audit Events to Track

| Category | Events |
|----------|--------|
| **Authentication** | `login`, `logout`, `login_failed`, `password_reset` |
| **Users** | `user_created`, `user_updated`, `user_disabled`, `user_deleted`, `role_changed` |
| **Leads** | `lead_paused`, `lead_resumed`, `lead_blocked`, `lead_deleted`, `note_added`, `tag_added` |
| **Bot Control** | `bot_takeover`, `message_sent_manual`, `bot_handed_back` |
| **Training** | `conversation_rated`, `example_submitted`, `example_approved`, `example_rejected` |
| **Prompts** | `prompt_created`, `prompt_deployed`, `prompt_rolled_back` |
| **Settings** | `setting_changed`, `api_key_rotated` |
| **Export** | `data_exported` |

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📋 AUDIT LOG                                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  FILTERS:                                                                        │
│  User: [All ▼]  Action: [All ▼]  Target: [All ▼]  Date: [Last 7 days ▼]        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIMESTAMP        │ USER          │ ACTION           │ DETAILS           │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 14:32:05         │ Sergiu        │ message_sent     │ Lead: @maria.ion  │   │
│  │ Today            │               │ _manual          │ "Salut! Am văz..." │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 14:28:12         │ Sergiu        │ bot_takeover     │ Lead: @maria.ion  │   │
│  │ Today            │               │                  │ Reason: needs_human│   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 13:45:00         │ Maria         │ lead_paused      │ Lead: @dan.popa   │   │
│  │ Today            │               │                  │                    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ 12:30:22         │ Sergiu        │ user_created     │ User: maria@...   │   │
│  │ Today            │               │                  │ Role: Operator     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ Yesterday        │ Sergiu        │ prompt_deployed  │ Version: v2.4      │   │
│  │ 18:00            │               │                  │                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Export CSV]                                          Page 1 of 45             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 System Settings (Admin Only)

**Route:** `/dashboard/admin/system`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ SYSTEM SETTINGS                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🤖 BOT CONFIGURATION                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Global Bot Status                                                       │   │
│  │  [🟢 Active ─────────────○] All conversations processed                  │   │
│  │  ⚠️ Warning: Disabling will stop ALL bot responses                      │   │
│  │                                                                          │   │
│  │  Calendar Link                                                           │   │
│  │  [https://calendly.com/vlad-gogoanta/call________________]               │   │
│  │                                                                          │   │
│  │  Claude Model                                                            │   │
│  │  [claude-sonnet-4-5-20250929 ▼]                                         │   │
│  │                                                                          │   │
│  │  Max Tokens per Response                                                 │   │
│  │  [1024_____]                                                             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔔 AUTOMATIC FLAGS                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Auto-flag for human when:                                               │   │
│  │  • Messages exceed [25] without booking                                  │   │
│  │  • Stuck in same phase for [5] consecutive messages                      │   │
│  │  • Error count exceeds [3]                                               │   │
│  │  • User says keywords: [ajutor, om, persoana, real__________]           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  💰 BUDGET & LIMITS                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Daily API Budget Alert                                                  │   │
│  │  [$50____] (current: $12.40 today)                                       │   │
│  │                                                                          │   │
│  │  Monthly Budget Cap                                                      │   │
│  │  [$500___] (current: $287.50 this month)                                 │   │
│  │  ☐ Pause bot if exceeded (dangerous!)                                    │   │
│  │                                                                          │   │
│  │  Rate Limiting                                                           │   │
│  │  Max [10] messages per user per minute                                   │   │
│  │  Debounce delay [2] seconds                                              │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Cancel Changes]                                            [Save Settings]    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Admin Navigation Structure

```typescript
// Admin sidebar items
const adminNavItems = [
  {
    title: 'Users',
    href: '/dashboard/admin/users',
    icon: Users,
    description: 'Manage team accounts'
  },
  {
    title: 'Roles & Permissions',
    href: '/dashboard/admin/roles',
    icon: Shield,
    description: 'Configure access levels'
  },
  {
    title: 'System Settings',
    href: '/dashboard/admin/system',
    icon: Settings,
    description: 'Bot and app configuration'
  },
  {
    title: 'Audit Log',
    href: '/dashboard/admin/audit',
    icon: FileText,
    description: 'Activity history'
  },
  {
    title: 'API Keys',
    href: '/dashboard/admin/api-keys',
    icon: Key,
    description: 'Manage integrations'
  },
  {
    title: 'System Health',
    href: '/dashboard/admin/health',
    icon: Activity,
    description: 'Monitor performance'
  }
];
```

---

## Part 4: Core Dashboard Pages

### 4.1 Dashboard Structure

```
/dashboard                    → Overview (Home)
/dashboard/live               → Live Feed
/dashboard/leads              → Leads List
/dashboard/leads/[id]         → Conversation View
/dashboard/analytics          → Analytics & Reports
/dashboard/training           → Training Center
/dashboard/settings           → User Settings
/dashboard/logs               → Logs & Debug
/dashboard/alerts             → Alerts Panel
/dashboard/admin              → Admin Panel (Admin only)
/dashboard/admin/users        → User Management
/dashboard/admin/audit        → Audit Log
/dashboard/admin/system       → System Settings
```

### 4.2 Overview Page (Home Dashboard)

**Route:** `/dashboard`  
**Access:** All roles

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 OVERVIEW                                    Welcome, Sergiu! [🔴 3] [🔔 5]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │     24       │  │      7       │  │     68%      │  │    $12.40    │        │
│  │  Active      │  │   Calls      │  │  Conversion  │  │   API Cost   │        │
│  │  Today       │  │   Booked     │  │    Rate      │  │   Today      │        │
│  │  ↑ 12%       │  │   (this wk)  │  │   ↑ 5%       │  │   ↓ 8%       │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                  │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  📈 ACTIVITY (Last 7 days)          │  │  🎯 QUALIFICATION FUNNEL        │  │
│  │  [Line/Bar Chart]                   │  │  [Funnel Visualization]         │  │
│  └─────────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ NEEDS ATTENTION (3)                                  [View All →]    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  🔴 @maria.pop - Needs Human - 5 min ago           [View] [Take Over]   │   │
│  │  🔴 @alex.ion - Needs Human - 12 min ago           [View] [Take Over]   │   │
│  │  🟡 @dan.popa - Stuck P4 (5 msgs) - 20 min ago     [View] [Take Over]   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │  🕐 RECENT ACTIVITY               │  │  👥 TEAM ONLINE                   │  │
│  ├──────────────────────────────────┤  ├───────────────────────────────────┤  │
│  │  14:32 │ @andrei → P4            │  │  🟢 Sergiu (You) - Admin          │  │
│  │  14:31 │ @elena → BOOKED! 🎉     │  │  🟢 Maria - Operator              │  │
│  │  14:28 │ @ion → NEW              │  │  ⚪ Vlad - Offline (2h ago)       │  │
│  │  [View Live Feed →]              │  │                                    │  │
│  └──────────────────────────────────┘  └───────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Live Feed Page

**Route:** `/dashboard/live`  
**Access:** All roles

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔴 LIVE FEED                               [⏸️ Pause] [🔄 Auto-scroll] [🔔 On] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  FILTERS: [All ▼] [Status ▼] [Phase ▼] [Assigned to: All ▼]        🔍 Search   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 14:32:05 │ 🟢 │ @andrei.pop │ P3 → P4 │ Assigned: Maria                  │   │
│  │ "User explained current situation, moving to problem identification..."  │   │
│  │ [View Full] [Take Over] [Assign ▼]                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 14:31:42 │ 🔴 │ @maria.ion │ NEEDS HUMAN │ Assigned: Unassigned          │   │
│  │ AI Analysis: "User asking about price repeatedly, likely skeptic"        │   │
│  │ [View Full] [Take Over] [Assign ▼] [Dismiss Flag]                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ... (real-time feed) ...                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Leads List Page

**Route:** `/dashboard/leads`  
**Access:** All roles (filtered by assignment for operators if enabled)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  👥 LEADS                                                        Total: 1,247   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🔍 [Search by name or @handle...____________________]                          │
│                                                                                  │
│  FILTERS:                                                                        │
│  Status: [All ▼]  Phase: [All ▼]  Assigned: [All ▼]  Tags: [All ▼]             │
│  ☐ Needs Human  ☐ Bot Paused  ☐ Booked  ☐ Has Errors  Date: [Last 30d ▼]       │
│                                                                                  │
│  [Clear] [Save Filter ▼]                              [Export CSV] [Refresh]    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │☐│ LEAD          │ STATUS    │PHASE│ MSGS │ ASSIGNED │ TAGS    │ ACTIVE │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │☐│ Andrei        │🔵Exploring│ P4  │ 8    │ Maria    │ #hot    │ 5m ago │   │
│  │ │ @andrei.pop   │           │     │      │          │         │        │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │☐│ Maria         │🔴Needs    │ P3  │ 12   │ —        │ #urgent │ 10m ago│   │
│  │ │ @maria.ion    │  Human    │     │      │          │         │        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Selected (2): [Assign To ▼] [Add Tag ▼] [⏸️ Pause] [▶️ Resume]                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Conversation View

**Route:** `/dashboard/leads/[id]`  
**Access:** All roles (view), Operators+ (edit/takeover)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ← Back │ @andrei.pop │ Andrei │ 🔵 Exploring │ P4 │ Assigned: Maria           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─────────────────┐ ┌───────────────────────────────┐ ┌─────────────────────┐  │
│ │   LEAD INFO     │ │       CONVERSATION            │ │   INTELLIGENCE      │  │
│ ├─────────────────┤ ├───────────────────────────────┤ ├─────────────────────┤  │
│ │                 │ │                               │ │                     │  │
│ │ Name: Andrei    │ │  👤 User (14:25)              │ │ STATUS              │  │
│ │ @andrei.pop     │ │  ┌─────────────────────────┐  │ │ [Exploring      ▼] │  │
│ │                 │ │  │ Salut! Am văzut story  │  │ │                     │  │
│ │ Source: story   │ │  │ -ul tău. Mă interes...│  │ │ PHASE               │  │
│ │ Created: 2h ago │ │  └─────────────────────────┘  │ │ [P4             ▼] │  │
│ │                 │ │                               │ │                     │  │
│ │ ─────────────── │ │  🤖 Vlad (14:25)              │ │ ASSIGNED TO         │  │
│ │                 │ │  ┌─────────────────────────┐  │ │ [Maria          ▼] │  │
│ │ TAGS            │ │  │ Hey! Mă bucur că mi-ai │  │ │                     │  │
│ │ #hot #ecommerce │ │  │ scris 🙏               │  │ │ ─────────────────  │  │
│ │ [+ Add Tag]     │ │  └─────────────────────────┘  │ │                     │  │
│ │                 │ │  [📋 Show AI Analysis]        │ │ STEPS COMPLETED    │  │
│ │ ─────────────── │ │                               │ │ ✅ P1 - Opener     │  │
│ │                 │ │  ... more messages ...        │ │ ✅ P2 - Small talk │  │
│ │ CONTROLS        │ │                               │ │ ✅ P3 - Setup      │  │
│ │ [⏸️ Pause Bot]  │ │  👤 User (14:32)              │ │ ✅ P4 - Încercări  │  │
│ │ [🚩 Flag Human] │ │  ┌─────────────────────────┐  │ │ ⬜ P5 - Probleme   │  │
│ │ [🚫 Block]      │ │  │ Da, aș vrea să încerc  │  │ │ ⬜ P6 - WHY        │  │
│ │                 │ │  │ dar sunt sceptic...    │  │ │ ⬜ P7 - Booking   │  │
│ │ ─────────────── │ │  └─────────────────────────┘  │ │                     │  │
│ │                 │ │                               │ │ ─────────────────  │  │
│ │ NOTES           │ │  🤖 Generating...              │ │                     │  │
│ │ ┌─────────────┐ │ │                               │ │ COLLECTED DATA     │  │
│ │ │ User seems  │ │ ├───────────────────────────────┤ │ Situație: Student │  │
│ │ │ interested  │ │ │ 💬 QUICK RESPONSES            │ │ Obiectiv: 2000€   │  │
│ │ │ but hesitant│ │ │ [Clarify skepticism]          │ │ Obstacol: Timp    │  │
│ │ └─────────────┘ │ │ [Ask about budget]            │ │                     │  │
│ │ [Save] [History]│ │ [Schedule call]               │ │ ─────────────────  │  │
│ │                 │ ├───────────────────────────────┤ │                     │  │
│ └─────────────────┘ │ MANUAL RESPONSE               │ │ AI ANALYSIS        │  │
│                     │ ┌─────────────────────────┐   │ │ [Expand ▼]         │  │
│                     │ │ Type message...         │   │ │ "Scepticism must   │  │
│                     │ └─────────────────────────┘   │ │ be clarified..."   │  │
│                     │ [📎] [Send] [Send & Pause]    │ └─────────────────────┘  │
│                     └───────────────────────────────┘                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Analytics & Insights

### 5.1 Analytics Page

**Route:** `/dashboard/analytics`  
**Access:** All roles (export: Manager+)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 ANALYTICS                                   Period: [Last 30 days ▼]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Overview] [Funnel] [Sources] [Objections] [Team Performance] [Costs]          │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CONVERSION FUNNEL                                                       │   │
│  │  [Funnel visualization with conversion rates between each stage]         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  DROP-OFF ANALYSIS           │  │  TOP OBJECTIONS                      │   │
│  │  [Bar chart by phase]        │  │  [Pie chart + list]                  │   │
│  └──────────────────────────────┘  └──────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  LEAD SOURCES                │  │  TEAM PERFORMANCE                    │   │
│  │  [Performance by source]     │  │  [Interventions, success rate]       │   │
│  └──────────────────────────────┘  └──────────────────────────────────────┘   │
│                                                                                  │
│  [Export Report PDF] [Export Data CSV]                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Team Performance Tab

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  👥 TEAM PERFORMANCE                                    Period: [Last 30 days]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TEAM MEMBER     │ INTERVENTIONS │ MESSAGES SENT │ SUCCESS RATE │ AVG TIME│   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │ Maria (Operator)│ 45            │ 120           │ 72%          │ 4.2 min │   │
│  │ Sergiu (Admin)  │ 23            │ 68            │ 78%          │ 3.1 min │   │
│  │ Vlad (Manager)  │ 8             │ 22            │ 75%          │ 5.5 min │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Success Rate = Interventions that led to booking / Total interventions         │
│  Avg Time = Average response time after taking over                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Training & Optimization

### 6.1 Training Center

**Route:** `/dashboard/training`  
**Access:** Operators+ (rate, submit), Managers+ (approve), Admins (edit prompts)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🎓 TRAINING CENTER                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Pending Reviews] [Saved Examples] [Prompt Versions] [My Submissions]          │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📝 PENDING REVIEWS (12)                    Your reviews today: 5/10    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │   │
│  │  │ @maria.ion - P4 - 2h ago                              [Skip]       │ │   │
│  │  │                                                                     │ │   │
│  │  │ USER: "Am încercat dropshipping dar nu a mers deloc"               │ │   │
│  │  │                                                                     │ │   │
│  │  │ BOT: "Înțeleg frustrarea! Mulți au trecut prin asta la început.   │ │   │
│  │  │       Ce anume nu a mers? Reclame, produse, sau altceva?"          │ │   │
│  │  │                                                                     │ │   │
│  │  │ [👍 Good] [😐 OK] [👎 Bad]                                         │ │   │
│  │  │                                                                     │ │   │
│  │  │ [✏️ Edit & Submit as Example] (requires Manager approval)          │ │   │
│  │  └────────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📊 YOUR FEEDBACK STATS                                                  │   │
│  │  This week: 35 reviews │ 👍 28 │ 😐 5 │ 👎 2                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Example Approval Queue (Manager+ only)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ✅ PENDING APPROVAL (8 examples)                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Submitted by: Maria │ Category: Objection - Budget │ 2h ago             │   │
│  │                                                                          │   │
│  │ SCENARIO: User says they don't have money                                │   │
│  │                                                                          │   │
│  │ ORIGINAL:                                                                │   │
│  │ User: "Ar fi super dar nu am bani acum"                                 │   │
│  │ Bot: "Nu-ți face griji de buget..."                                     │   │
│  │                                                                          │   │
│  │ IMPROVED (submitted):                                                    │   │
│  │ Bot: "Înțeleg situația. Dar hai să fim sinceri - e vorba că chiar       │   │
│  │       nu ai de unde, sau că nu e încă o prioritate pentru tine?"        │   │
│  │                                                                          │   │
│  │ [✅ Approve] [❌ Reject] [✏️ Edit & Approve] [💬 Request Changes]       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Prompt Editor (Admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📜 PROMPT EDITOR                               Current: v2.4 (Active)          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Versions ▼ v2.4] [Compare] [Test] [History]                                   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ # SYSTEM PROMPT: Appointment Setting Agent                               │   │
│  │ ## Pentru Vlad Gogoanta - Coach de eCommerce                            │   │
│  │                                                                          │   │
│  │ ---                                                                      │   │
│  │                                                                          │   │
│  │ <role>                                                                   │   │
│  │ Tu ești Vlad Gogoanta, coach de eCommerce din România...                │   │
│  │ </role>                                                                  │   │
│  │                                                                          │   │
│  │ ... (scrollable editor) ...                                              │   │
│  │                                                                          │   │
│  │ Variables: {{LEAD_NAME}} {{CALENDAR_LINK}} ...                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Description of changes:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Added 3 new examples for handling "sunt sceptic" objection              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Cancel] [Save as Draft] [Test in Sandbox] [🚀 Deploy as v2.5]                 │
│                                                                                  │
│  ⚠️ Warning: Deploying will affect ALL new conversations immediately           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: System Management

### 7.1 User Settings

**Route:** `/dashboard/settings`  
**Access:** All (own settings only)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ MY SETTINGS                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Profile] [Notifications] [Preferences] [Security]                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  👤 PROFILE                                                              │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Full Name: [Sergiu Admin_________________]                              │   │
│  │  Email: sergiu@example.com (cannot change)                               │   │
│  │  Role: Admin (cannot change)                                             │   │
│  │                                                                          │   │
│  │  [Save Changes]                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔔 NOTIFICATIONS                                                        │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ☑ Browser notifications                                                 │   │
│  │  ☐ Email notifications                                                   │   │
│  │  ☑ Sound alerts for needs_human                                          │   │
│  │                                                                          │   │
│  │  Notify me when:                                                         │   │
│  │  ☑ Lead flagged as needs_human                                           │   │
│  │  ☑ Lead assigned to me                                                   │   │
│  │  ☑ New booking confirmed                                                 │   │
│  │  ☐ Daily summary                                                         │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 PREFERENCES                                                          │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Theme: [Light ▼] / [Dark] / [System]                                    │   │
│  │  Default page: [Overview ▼]                                              │   │
│  │  Items per page: [25 ▼]                                                  │   │
│  │  ☑ Enable keyboard shortcuts                                             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🔐 SECURITY                                                             │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  [Change Password]                                                       │   │
│  │                                                                          │   │
│  │  Active Sessions:                                                        │   │
│  │  • Chrome on macOS - Current session                                     │   │
│  │  • Safari on iPhone - 2 days ago [Revoke]                                │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Logs & Debug

**Route:** `/dashboard/logs`  
**Access:** Admin only

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔍 LOGS & DEBUG                                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Error Logs] [API Usage] [Webhook Tester] [System Health]                      │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ERROR LOGS                              Time: [Last 24h ▼]              │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  Level: [All ▼]  Type: [All ▼]  Lead: [_____________]                   │   │
│  │                                                                          │   │
│  │  14:32:05 │ ERROR │ Claude API timeout │ @maria.ion │ Retry 1/3         │   │
│  │  14:30:22 │ WARN  │ Parse error │ @dan.popa │ Fallback used             │   │
│  │  ... (scrollable log)                                                    │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  ERROR SUMMARY (24h)         │  │  API USAGE TODAY                     │   │
│  │  Requests: 482               │  │  Claude: 156 req │ $12.40            │   │
│  │  Errors: 7 (1.5%)            │  │  Cache hit: 89%                       │   │
│  │  Most common: timeout        │  │  ManyChat: 312 req                    │   │
│  └──────────────────────────────┘  └──────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Webhook Tester (Admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🧪 WEBHOOK TESTER                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ⚠️ This sends real webhooks. Use with test accounts only!                     │
│                                                                                  │
│  ManyChat User ID: [test_user_123_______________]                               │
│  First Name: [Test__________]                                                   │
│  Last Name: [User__________]                                                    │
│  IG Username: [test_account__]                                                  │
│                                                                                  │
│  Message (AI > User Messages):                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Salut! Am văzut story-ul tău despre ecommerce și m-ar interesa să      │   │
│  │ aflu mai multe.                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  [Send Test Webhook]                                                            │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  RESPONSE:                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Status: 200 OK                                                           │   │
│  │ Time: 2.34s                                                              │   │
│  │                                                                          │   │
│  │ Response: { "status": "ok" }                                            │   │
│  │                                                                          │   │
│  │ AI Response chunks:                                                      │   │
│  │ 1. "Hey! Mă bucur că mi-ai scris 🙏"                                    │   │
│  │ 2. "Povestește-mi puțin despre situația ta actuală..."                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Advanced Features

### 8.1 Lead Assignment System

#### Database Schema Addition

```sql
-- Add assigned_to to leads table
ALTER TABLE leads ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN assignment_note TEXT;

CREATE INDEX idx_leads_assigned ON leads(assigned_to);
```

#### Assignment Rules

```typescript
interface AssignmentConfig {
  // Auto-assignment rules
  auto_assign: boolean;
  assignment_strategy: 'round_robin' | 'least_busy' | 'manual';
  
  // Only assign to online operators
  only_online: boolean;
  
  // Max leads per operator
  max_leads_per_operator: number;
  
  // Reassign if not responded in X minutes
  auto_reassign_timeout: number;
}
```

### 8.2 Response Templates

#### Database Schema

```sql
CREATE TABLE response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,              -- 'greeting', 'objection', 'booking', 'clarify'
  shortcut TEXT,              -- e.g., '/clarify', '/book'
  variables TEXT[],           -- ['name', 'time']
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,  -- Available to all users
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Quick Response UI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  💬 QUICK RESPONSES                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Type "/" to search templates                                                   │
│                                                                                  │
│  FREQUENTLY USED:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ [Clarify Skepticism] [Ask Budget] [Schedule Call] [Normalize]           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  /clarify → "Sceptic în legătură cu ce anume?"                                 │
│  /budget → "Ești deschis să investești timp, bani și energie..."               │
│  /book → "Uite, eu sunt cam full, dar cred că îmi pot face timp..."           │
│                                                                                  │
│  [Manage Templates]                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Tags System

#### Database Schema

```sql
-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',  -- Tailwind indigo
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead-tag junction
CREATE TABLE lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, tag_id)
);

-- Default tags
INSERT INTO tags (name, color, description) VALUES
  ('hot', '#ef4444', 'High priority lead'),
  ('cold', '#3b82f6', 'Low engagement'),
  ('follow-up', '#f59e0b', 'Needs follow-up'),
  ('VIP', '#8b5cf6', 'Very important'),
  ('student', '#10b981', 'Student lead'),
  ('experienced', '#6366f1', 'Has ecommerce experience');
```

### 8.4 Keyboard Shortcuts

```typescript
const keyboardShortcuts = {
  global: {
    'cmd+k': 'Open command palette / search',
    'cmd+/': 'Show keyboard shortcuts',
    'g h': 'Go to Home/Overview',
    'g l': 'Go to Leads',
    'g f': 'Go to Live Feed',
    'g a': 'Go to Analytics',
    'g t': 'Go to Training',
    'g s': 'Go to Settings',
  },
  leadsList: {
    'j': 'Next lead',
    'k': 'Previous lead',
    'enter': 'Open selected lead',
    'p': 'Pause bot for selected',
    'r': 'Resume bot for selected',
    'f': 'Flag for human',
    '/': 'Focus search',
  },
  conversation: {
    'cmd+enter': 'Send message',
    'cmd+shift+enter': 'Send and pause bot',
    't': 'Toggle AI analysis',
    'esc': 'Close / Go back',
    '/': 'Open quick responses',
  },
};
```

### 8.5 Dark Mode

```typescript
// Theme configuration
const themes = {
  light: {
    background: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    muted: 'text-gray-500',
    border: 'border-gray-200',
  },
  dark: {
    background: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    muted: 'text-gray-400',
    border: 'border-gray-700',
  },
};

// Use user preference or system default
function useTheme() {
  const { user } = useAuth();
  const systemPreference = useMediaQuery('(prefers-color-scheme: dark)');
  
  const theme = user?.preferences?.theme || 'system';
  
  if (theme === 'system') {
    return systemPreference ? 'dark' : 'light';
  }
  return theme;
}
```

### 8.6 Export & Backup

```typescript
// Export options
interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  data: 'leads' | 'conversations' | 'analytics' | 'audit_log';
  filters?: LeadFilters;
  dateRange?: { from: Date; to: Date };
  includeMessages?: boolean;
  includeAnalysis?: boolean;
}

// API endpoint
// GET /api/export?format=csv&data=leads&status=qualified&from=2024-01-01
async function GET(request: Request) {
  const { user } = await getServerSession();
  
  // Check permission
  if (!hasPermission(user.role, 'export:data')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const params = new URL(request.url).searchParams;
  const format = params.get('format') || 'csv';
  const data = params.get('data') || 'leads';
  
  // Fetch and format data
  const exportData = await fetchExportData(data, params);
  
  // Log export action
  await logAuditEvent({
    user_id: user.id,
    action: 'data_exported',
    details: { format, data, filters: Object.fromEntries(params) }
  });
  
  // Return formatted response
  if (format === 'csv') {
    return new Response(convertToCSV(exportData), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${data}-export-${Date.now()}.csv"`
      }
    });
  }
  
  // ... handle other formats
}
```

### 8.7 Saved Filters

```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example saved filter
INSERT INTO saved_filters (user_id, name, filters) VALUES
  ('user-uuid', 'Hot Leads', '{
    "qualification_status": ["qualified", "likely_qualified"],
    "call_booked": false,
    "tags": ["hot"]
  }');
```

---

## Part 9: Technical Implementation

### 9.1 Complete Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                    # Dashboard shell with sidebar
│   │   ├── page.tsx                      # Overview
│   │   ├── live/
│   │   │   └── page.tsx                  # Live Feed
│   │   ├── leads/
│   │   │   ├── page.tsx                  # Leads List
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Conversation View
│   │   ├── analytics/
│   │   │   └── page.tsx                  # Analytics
│   │   ├── training/
│   │   │   ├── page.tsx                  # Training Center
│   │   │   ├── examples/
│   │   │   │   └── page.tsx              # Saved Examples
│   │   │   ├── prompts/
│   │   │   │   └── page.tsx              # Prompt Versions (Admin)
│   │   │   └── approval/
│   │   │       └── page.tsx              # Approval Queue (Manager+)
│   │   ├── settings/
│   │   │   └── page.tsx                  # User Settings
│   │   ├── logs/
│   │   │   └── page.tsx                  # Logs & Debug (Admin)
│   │   ├── alerts/
│   │   │   └── page.tsx                  # Alerts Panel
│   │   └── admin/
│   │       ├── layout.tsx                # Admin layout guard
│   │       ├── page.tsx                  # Admin Overview
│   │       ├── users/
│   │       │   └── page.tsx              # User Management
│   │       ├── audit/
│   │       │   └── page.tsx              # Audit Log
│   │       ├── system/
│   │       │   └── page.tsx              # System Settings
│   │       └── health/
│   │           └── page.tsx              # System Health
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts    # If using NextAuth
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   ├── route.ts              # List, Create users
│   │   │   │   └── [id]/route.ts         # Get, Update, Delete user
│   │   │   ├── audit/route.ts            # Audit log
│   │   │   └── settings/route.ts         # System settings
│   │   ├── dashboard/
│   │   │   ├── overview/route.ts         # Dashboard stats
│   │   │   └── analytics/route.ts        # Analytics data
│   │   ├── leads/
│   │   │   ├── route.ts                  # List, filters
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts              # CRUD
│   │   │   │   ├── messages/route.ts     # Send manual message
│   │   │   │   ├── assign/route.ts       # Assign to user
│   │   │   │   └── tags/route.ts         # Manage tags
│   │   │   └── bulk/route.ts             # Bulk actions
│   │   ├── training/
│   │   │   ├── ratings/route.ts          # Submit ratings
│   │   │   ├── examples/
│   │   │   │   ├── route.ts              # List, submit
│   │   │   │   └── [id]/
│   │   │   │       └── approve/route.ts  # Approve/reject
│   │   │   └── prompts/
│   │   │       ├── route.ts              # List, create
│   │   │       └── [id]/
│   │   │           └── deploy/route.ts   # Deploy version
│   │   ├── tags/route.ts                 # Tags CRUD
│   │   ├── templates/route.ts            # Response templates
│   │   ├── alerts/route.ts               # Alerts
│   │   ├── export/route.ts               # Data export
│   │   ├── logs/route.ts                 # Error logs
│   │   └── health/route.ts               # Health check
│   │
│   └── layout.tsx                        # Root layout
│
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── dashboard/
│   │   ├── DashboardShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── CommandPalette.tsx            # Cmd+K
│   │   ├── StatsCard.tsx
│   │   ├── QualificationFunnel.tsx
│   │   ├── NeedsAttentionList.tsx
│   │   ├── RecentActivity.tsx
│   │   └── TeamOnline.tsx
│   ├── leads/
│   │   ├── LeadsTable.tsx
│   │   ├── LeadFilters.tsx
│   │   ├── LeadRow.tsx
│   │   ├── ConversationView.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── LeadInfoPanel.tsx
│   │   ├── IntelligencePanel.tsx
│   │   ├── ManualResponseInput.tsx
│   │   ├── QuickResponses.tsx
│   │   ├── TagSelector.tsx
│   │   └── AssignmentDropdown.tsx
│   ├── analytics/
│   │   ├── ConversionFunnel.tsx
│   │   ├── DropOffChart.tsx
│   │   ├── SourcesChart.tsx
│   │   ├── TeamPerformance.tsx
│   │   └── CostAnalysis.tsx
│   ├── training/
│   │   ├── PendingReviews.tsx
│   │   ├── RatingButtons.tsx
│   │   ├── ExampleEditor.tsx
│   │   ├── ApprovalQueue.tsx
│   │   ├── PromptEditor.tsx
│   │   └── PromptVersions.tsx
│   ├── admin/
│   │   ├── UsersTable.tsx
│   │   ├── UserForm.tsx
│   │   ├── AuditLog.tsx
│   │   └── SystemSettings.tsx
│   ├── alerts/
│   │   ├── AlertsList.tsx
│   │   ├── AlertItem.tsx
│   │   └── NotificationBell.tsx
│   ├── live/
│   │   ├── LiveFeed.tsx
│   │   └── LiveFeedItem.tsx
│   └── ui/                               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── table.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── badge.tsx
│       ├── avatar.tsx
│       ├── tooltip.tsx
│       ├── command.tsx                   # For Cmd+K
│       └── ...
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── RealtimeContext.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useLeads.ts
│   ├── useLead.ts
│   ├── useLiveFeed.ts
│   ├── useOverview.ts
│   ├── useAlerts.ts
│   ├── useSettings.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useRealtime.ts
│   └── usePermission.ts
│
├── lib/
│   ├── supabase.ts                       # Server client
│   ├── supabase-browser.ts               # Browser client
│   ├── permissions.ts                    # Permission checker
│   ├── audit.ts                          # Audit logging helper
│   └── utils.ts
│
├── types/
│   ├── lead.types.ts
│   ├── user.types.ts
│   ├── dashboard.types.ts
│   ├── training.types.ts
│   └── api.types.ts
│
└── middleware.ts                         # Auth middleware
```

### 9.2 Complete Database Schema

```sql
-- ============================================
-- AUTHENTICATION & USERS
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{
    "theme": "light",
    "notifications": {"browser": true, "email": false, "sound": true},
    "dashboard": {"default_page": "/dashboard", "items_per_page": 25}
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- LEADS (Extended)
-- ============================================

-- Add columns to existing leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assignment_note TEXT;

-- ============================================
-- TAGS
-- ============================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, tag_id)
);

-- Default tags
INSERT INTO tags (name, color, description) VALUES
  ('hot', '#ef4444', 'High priority lead'),
  ('cold', '#3b82f6', 'Low engagement'),
  ('follow-up', '#f59e0b', 'Needs follow-up'),
  ('VIP', '#8b5cf6', 'Very important'),
  ('student', '#10b981', 'Student lead'),
  ('experienced', '#6366f1', 'Has ecommerce experience');

-- ============================================
-- RESPONSE TEMPLATES
-- ============================================

CREATE TABLE response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  shortcut TEXT,
  variables TEXT[],
  created_by UUID REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default templates
INSERT INTO response_templates (name, content, category, shortcut, is_global) VALUES
  ('Clarify Skepticism', 'Sceptic în legătură cu ce anume?', 'objection', '/clarify', true),
  ('Ask Investment Ready', 'Ești deschis să investești timp, bani și energie în a te educa și a reuși să te dezvolți pe partea asta?', 'qualification', '/invest', true),
  ('Schedule Call', 'Uite, eu sunt cam full perioada asta, dar cred că îmi pot face timp să discutăm la un telefon. Cum arată programul tău?', 'booking', '/book', true);

-- ============================================
-- SAVED FILTERS
-- ============================================

CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRAINING & RATINGS
-- ============================================

CREATE TABLE conversation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  message_index INTEGER,
  rating TEXT CHECK (rating IN ('good', 'ok', 'bad')),
  notes TEXT,
  rated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  scenario TEXT NOT NULL,
  user_message TEXT NOT NULL,
  original_response TEXT,
  improved_response TEXT NOT NULL,
  tags TEXT[],
  source_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  performance_metrics JSONB,
  created_by UUID REFERENCES users(id),
  deployed_by UUID REFERENCES users(id),
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  message TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES users(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ERROR LOGS
-- ============================================

CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  level TEXT CHECK (level IN ('info', 'warn', 'error')),
  error_type TEXT,
  message TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- API USAGE TRACKING
-- ============================================

CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  endpoint TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  cost_usd DECIMAL(10, 6),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APP SETTINGS
-- ============================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO app_settings (key, value) VALUES
  ('bot_enabled', 'true'),
  ('calendar_link', '"https://calendly.com/vlad-gogoanta/call"'),
  ('claude_model', '"claude-sonnet-4-5-20250929"'),
  ('max_tokens', '1024'),
  ('auto_flag_message_threshold', '25'),
  ('auto_flag_phase_stuck_threshold', '5'),
  ('daily_budget_alert', '50'),
  ('monthly_budget_cap', '500');

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON lead_tags(tag_id);

CREATE INDEX idx_conversation_ratings_lead ON conversation_ratings(lead_id);
CREATE INDEX idx_training_examples_status ON training_examples(status);
CREATE INDEX idx_prompt_versions_active ON prompt_versions(is_active) WHERE is_active = true;

CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON error_logs(resolved, created_at DESC) WHERE resolved = false;

CREATE INDEX idx_api_usage_date ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_service ON api_usage(service);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Audit log policies
CREATE POLICY "Admins and managers can view audit" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Error logs policies
CREATE POLICY "Admins can manage error logs" ON error_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- App settings policies
CREATE POLICY "Admins can manage settings" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "All can read settings" ON app_settings FOR SELECT USING (true);
```

---

## Part 10: Implementation Roadmap

### Phase 1: Foundation & Auth (Week 1-2)

**Week 1: Setup & Authentication**
- [ ] Day 1: Project setup, shadcn/ui installation, Tailwind config
- [ ] Day 2: Database schema (run all SQL migrations)
- [ ] Day 3: Supabase Auth setup, users table
- [ ] Day 4: Login page, middleware protection
- [ ] Day 5: Auth context, hooks, permission checker

**Week 2: Dashboard Shell**
- [ ] Day 1: Dashboard layout, Sidebar, TopBar
- [ ] Day 2: Overview page - stats cards
- [ ] Day 3: Overview page - charts, needs attention
- [ ] Day 4: User settings page
- [ ] Day 5: Dark mode, theme switching

**Deliverable:** Secured dashboard with login, overview stats, theme support

---

### Phase 2: Lead Management (Week 3-4)

**Week 3: Leads List & Filters**
- [ ] Day 1: Leads table component
- [ ] Day 2: Filters, search, pagination
- [ ] Day 3: Bulk actions, export CSV
- [ ] Day 4: Tags system
- [ ] Day 5: Saved filters

**Week 4: Conversation View**
- [ ] Day 1: Conversation layout (3-column)
- [ ] Day 2: Chat interface, message bubbles
- [ ] Day 3: Lead info panel, controls
- [ ] Day 4: Intelligence panel, status updates
- [ ] Day 5: Manual response, quick templates

**Deliverable:** Full lead management with conversation view

---

### Phase 3: Real-time & Intervention (Week 5-6)

**Week 5: Live Feed & Real-time**
- [ ] Day 1: Supabase Realtime setup
- [ ] Day 2: Live feed page
- [ ] Day 3: Real-time updates in leads list
- [ ] Day 4: Browser notifications
- [ ] Day 5: Sound alerts, notification preferences

**Week 6: Human Intervention**
- [ ] Day 1: Take over flow
- [ ] Day 2: Send manual messages to ManyChat
- [ ] Day 3: Assignment system
- [ ] Day 4: Alerts page
- [ ] Day 5: Needs attention queue

**Deliverable:** Real-time monitoring with human intervention capabilities

---

### Phase 4: Admin Panel (Week 7)

**Week 7: Admin Features**
- [ ] Day 1: Admin layout, navigation
- [ ] Day 2: User management (list, create)
- [ ] Day 3: User management (edit, disable)
- [ ] Day 4: Audit log
- [ ] Day 5: System settings

**Deliverable:** Complete admin panel for user and system management

---

### Phase 5: Analytics & Training (Week 8-9)

**Week 8: Analytics**
- [ ] Day 1: Analytics page layout
- [ ] Day 2: Conversion funnel, drop-off
- [ ] Day 3: Sources, timing analysis
- [ ] Day 4: Team performance
- [ ] Day 5: Cost analysis, export

**Week 9: Training Center**
- [ ] Day 1: Pending reviews interface
- [ ] Day 2: Rating system
- [ ] Day 3: Example submission
- [ ] Day 4: Approval queue (Manager+)
- [ ] Day 5: Prompt editor (Admin)

**Deliverable:** Analytics dashboard and training system

---

### Phase 6: Polish & Advanced (Week 10)

**Week 10: Final Features**
- [ ] Day 1: Command palette (Cmd+K)
- [ ] Day 2: Keyboard shortcuts
- [ ] Day 3: Logs & debug page
- [ ] Day 4: Webhook tester
- [ ] Day 5: Testing, bug fixes, documentation

**Deliverable:** Production-ready dashboard

---

## Part 11: UI/UX Guidelines

### Design System

```typescript
// Status colors
const statusColors = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  exploring: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  likely_qualified: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  qualified: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  not_fit: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  nurture: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
};

// Role colors
const roleColors = {
  admin: { bg: 'bg-red-100', text: 'text-red-800' },
  manager: { bg: 'bg-blue-100', text: 'text-blue-800' },
  operator: { bg: 'bg-green-100', text: 'text-green-800' },
  viewer: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

// Alert severity
const alertColors = {
  high: { bg: 'bg-red-50', border: 'border-red-500', icon: 'text-red-600' },
  medium: { bg: 'bg-yellow-50', border: 'border-yellow-500', icon: 'text-yellow-600' },
  low: { bg: 'bg-blue-50', border: 'border-blue-500', icon: 'text-blue-600' },
  info: { bg: 'bg-green-50', border: 'border-green-500', icon: 'text-green-600' },
};
```

### Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Small desktop
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Large desktop
};

// Layout adjustments
// - Mobile: Single column, bottom navigation
// - Tablet: 2 columns, collapsible sidebar
// - Desktop: Full 3-column layout
```

### Component Library (shadcn/ui)

Required components to install:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add command
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add separator
```

---

## Summary

This dashboard provides:

1. **Security:** Role-based access, audit logging, protected routes
2. **Visibility:** Real-time feed, conversation view, analytics
3. **Control:** Human intervention, bot pause/resume, manual messages
4. **Collaboration:** Lead assignment, team performance, shared templates
5. **Improvement:** Training center, example approval, prompt versioning
6. **Administration:** User management, system settings, error logs

**Priority Implementation Order:**
1. Auth + Login + User Management (Admin can create accounts)
2. Overview + Leads List + Conversation View (Core monitoring)
3. Live Feed + Alerts + Human Intervention (Real-time control)
4. Analytics + Training Center (Optimization)
5. Admin Panel + Logs + Advanced Features (Full system management)

---

**Ready for Claude Code. Start with Phase 1, Week 1, Day 1.**
