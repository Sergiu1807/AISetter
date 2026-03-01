import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthRequest extends Request {
  user?: { id: string; email?: string };
  userRole?: string;
}

// Validate JWT from Authorization header
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = { id: user.id, email: user.email };

    // Fetch role
    const { data: userData } = await adminClient
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (userData && userData.is_active === false) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    req.userRole = userData?.role || 'viewer';
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Role check middleware factory
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}
