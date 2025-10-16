export type Role = 'admin' | 'parent' | 'user'

export function canAccessV3(role?: string): boolean {
  // Política inicial: admin y parent pueden probar v3.
  return role === 'admin' || role === 'parent'
}

