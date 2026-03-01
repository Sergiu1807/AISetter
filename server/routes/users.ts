import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/users - List all users (admin only)
router.get('/api/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, last_login_at, created_at, created_by')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ users });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create a new user (admin only)
router.post('/api/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { email, full_name, role, password } = req.body;

    if (!email || !full_name || !role || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, full_name, role, password'
      });
    }

    if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be admin, manager, operator, or viewer'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    // Create auth user via admin client (bypasses email confirmation)
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return res.status(500).json({ error: createError.message });
    }

    // Insert into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
        created_by: req.user!.id,
      } as any)
      .select('id, email, full_name, role, is_active, created_at, created_by')
      .single();

    if (insertError) {
      console.error('Error inserting user record:', insertError);
      // Attempt to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({ user: newUser });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id - Update user (admin only)
router.patch('/api/users/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const body = req.body;

    // Only allow specific fields to be updated
    const allowedFields = ['full_name', 'role', 'is_active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (body.role && !['admin', 'manager', 'operator', 'viewer'].includes(body.role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent admin from demoting themselves
    if (id === req.user!.id && body.role && body.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.id && body.is_active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates as any)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, last_login_at, created_at, created_by')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: error.message });
    }

    // If password is provided, update auth password
    if (body.password && body.password.length >= 6) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(id as string, {
        password: body.password,
      });
      if (pwError) {
        console.error('Error updating user password:', pwError);
        return res.status(500).json({ error: pwError.message });
      }
    }

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/api/users/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete from users table first
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting user record:', dbError);
      return res.status(500).json({ error: dbError.message });
    }

    // Delete auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id as string);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return res.status(500).json({ error: authDeleteError.message });
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
