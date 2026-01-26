// Permission checker utility
// Defines role-based permissions for the dashboard

import type { UserRole } from '@/types/database.types'

export type Permission =
  // View permissions
  | 'view:dashboard'
  | 'view:leads'
  | 'view:analytics'
  | 'view:training'
  | 'view:admin'
  | 'view:settings'
  | 'view:audit'

  // Edit permissions
  | 'edit:leads'
  | 'edit:user_profile'
  | 'edit:users'
  | 'edit:notifications'

  // Action permissions
  | 'control:bot'
  | 'takeover:conversation'
  | 'send:message'
  | 'block:lead'
  | 'rate:conversation'
  | 'submit:example'
  | 'approve:example'
  | 'export:data'
  | 'delete:lead'
  | 'manage:users'
  | 'manage:system'

// Role-based permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[] | '*'> = {
  admin: '*', // All permissions

  manager: [
    // View permissions
    'view:dashboard',
    'view:leads',
    'view:analytics',
    'view:training',
    'view:settings',
    'view:audit',

    // Edit permissions
    'edit:leads',
    'edit:user_profile',
    'edit:notifications',

    // Action permissions
    'control:bot',
    'takeover:conversation',
    'send:message',
    'block:lead',
    'rate:conversation',
    'submit:example',
    'approve:example',
    'export:data',
    'delete:lead',
  ],

  operator: [
    // View permissions
    'view:dashboard',
    'view:leads',
    'view:analytics',
    'view:training',

    // Edit permissions
    'edit:leads',
    'edit:user_profile',

    // Action permissions
    'control:bot',
    'takeover:conversation',
    'send:message',
    'rate:conversation',
    'submit:example',
  ],

  viewer: [
    // View permissions only
    'view:dashboard',
    'view:leads',
    'view:analytics',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false

  const rolePermissions = ROLE_PERMISSIONS[role]

  // Admin has all permissions
  if (rolePermissions === '*') return true

  // Check if permission is in role's permission list
  return rolePermissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every((permission) => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[role]

  if (rolePermissions === '*') {
    // Return all possible permissions for admin
    return Object.values(ROLE_PERMISSIONS)
      .filter((perms): perms is Permission[] => Array.isArray(perms))
      .flat()
      .filter((perm, index, self) => self.indexOf(perm) === index) // unique
  }

  return rolePermissions
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Check if user is manager or higher
 */
export function isManager(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if user is operator or higher
 */
export function isOperator(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'operator'
}
