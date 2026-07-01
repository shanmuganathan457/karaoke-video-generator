import { API_BASE_URL } from './api';
import { saveSession, clearSession, loadSession, User } from './authStore';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Helper to process fetch responses safely without throwing JSON parse errors on HTML/text errors.
 */
async function processResponse(response: Response, defaultErrorMessage: string): Promise<any> {
  const text = await response.text();
  let data: any = {};
  
  try {
    if (text.trim()) {
      data = JSON.parse(text);
    }
  } catch (err) {
    if (!response.ok) {
      throw new Error(`${defaultErrorMessage} (Status ${response.status})`);
    }
    throw new Error('Invalid response format from server.');
  }

  if (!response.ok) {
    throw new Error(data.detail || defaultErrorMessage);
  }

  return data;
}

/**
 * Register a new user and login.
 */
export async function register(email: string, password: string, name: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  const authData = await processResponse(response, 'Registration failed') as AuthResponse;
  await saveSession({
    token: authData.access_token,
    user: authData.user,
  });

  return authData.user;
}

/**
 * Login an existing user.
 */
export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const authData = await processResponse(response, 'Login failed') as AuthResponse;
  await saveSession({
    token: authData.access_token,
    user: authData.user,
  });

  return authData.user;
}

/**
 * Fetch current user profile.
 */
export async function getMe(): Promise<User> {
  const session = await loadSession();
  if (!session.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
  });

  try {
    const user = await processResponse(response, 'Failed to fetch user profile') as User;
    await saveSession({
      token: session.token,
      user: user,
    });
    return user;
  } catch (err: any) {
    if (response.status === 401) {
      await clearSession();
    }
    throw err;
  }
}

/**
 * Subscribe to a pricing plan.
 */
export async function subscribeToPlan(plan: 'Free' | 'Pro' | 'Enterprise'): Promise<User> {
  const session = await loadSession();
  if (!session.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
    body: JSON.stringify({ plan }),
  });

  const data = await processResponse(response, 'Subscription failed');
  const user = data.user as User;
  await saveSession({
    token: session.token,
    user: user,
  });

  return user;
}

/**
 * Logout the user and clear local session.
 */
export async function logout(): Promise<void> {
  await clearSession();
}
