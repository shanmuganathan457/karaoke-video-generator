import { API_BASE_URL } from './api';
import { loadSession } from './authStore';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  language: string;
  duration: number;
  created_at: string;
  token_cost: number;
  outputUrl?: string | null;
  thumbnailUrl?: string | null;
  error_message?: string | null;
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
 * Fetch all projects for the currently logged-in user.
 */
export async function listProjects(): Promise<Project[]> {
  const session = await loadSession();
  if (!session.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/projects`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
  });

  return await processResponse(response, 'Failed to load projects') as Project[];
}

/**
 * Delete a project by ID.
 */
export async function deleteProject(projectId: string): Promise<void> {
  const session = await loadSession();
  if (!session.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
  });

  await processResponse(response, 'Failed to delete project');
}

/**
 * Rename a project by ID.
 */
export async function renameProject(projectId: string, newName: string): Promise<void> {
  const session = await loadSession();
  if (!session.token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
    body: JSON.stringify({ name: newName }),
  });

  await processResponse(response, 'Failed to rename project');
}

/**
 * Helper to get the full absolute URL for a project's thumbnail image.
 */
export function getThumbnailUrl(projectId: string): string {
  // Add a timestamp to bypass Expo's aggressive image caching (fixes stuck blank thumbnails)
  return `${API_BASE_URL}/thumbnail/${projectId}?t=${Date.now()}`;
}
