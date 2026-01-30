import { createServerComponentClient } from './supabase';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

/**
 * Get the currently authenticated user (returns null if not authenticated)
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Require authentication - throws if not authenticated
 * Use in API routes and server components that require auth
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Require authentication with redirect - redirects to login if not authenticated
 * Use in pages that require auth
 */
export async function requireAuthWithRedirect(): Promise<User> {
  const user = await getAuthUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

/**
 * Get user ID for database queries
 * Returns the authenticated user's ID
 */
export async function getAuthUserId(): Promise<string> {
  const user = await requireAuth();
  return user.id;
}

/**
 * Check if user is authenticated (boolean check)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthUser();
  return user !== null;
}

/**
 * Get user session for API routes
 */
export async function getSession() {
  const supabase = await createServerComponentClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  
  return session;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createServerComponentClient();
  await supabase.auth.signOut();
  redirect('/login');
}
