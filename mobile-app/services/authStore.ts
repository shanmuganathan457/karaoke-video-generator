import * as FileSystem from 'expo-file-system/legacy';

const AUTH_FILE = `${FileSystem.documentDirectory}auth_session.json`;

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  tokens: number;
  project_count: number;
}

export interface AuthSession {
  token: string | null;
  user: User | null;
}

let memorySession: AuthSession = {
  token: null,
  user: null,
};

export async function loadSession(): Promise<AuthSession> {
  if (memorySession.token) {
    return memorySession;
  }
  try {
    const fileInfo = await FileSystem.getInfoAsync(AUTH_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(AUTH_FILE);
      memorySession = JSON.parse(content);
    }
  } catch (e) {
    console.error('Error loading auth session:', e);
  }
  return memorySession;
}

export async function saveSession(session: AuthSession): Promise<void> {
  memorySession = session;
  try {
    await FileSystem.writeAsStringAsync(AUTH_FILE, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

export async function clearSession(): Promise<void> {
  memorySession = { token: null, user: null };
  try {
    const fileInfo = await FileSystem.getInfoAsync(AUTH_FILE);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(AUTH_FILE);
    }
  } catch (e) {
    console.error('Error clearing auth session:', e);
  }
}

export function getCachedToken(): string | null {
  return memorySession.token;
}

export function getCachedUser(): User | null {
  return memorySession.user;
}
