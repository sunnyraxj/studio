import type { User } from '@/lib/types';
import { MOCK_USERS } from './data';

// In a real app, you'd get this from your auth provider
// For this demo, we'll cycle through users to simulate different roles.
// You can change the index to 1 to test the super_admin role.
const MOCK_USER_ID = 'user-1'; 

export async function getAuthenticatedUser(): Promise<User | null> {
  const user = MOCK_USERS.find(u => u.id === MOCK_USER_ID);
  return user || null;
}
