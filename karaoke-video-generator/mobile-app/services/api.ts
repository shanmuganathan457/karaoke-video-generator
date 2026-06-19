/**
 * KaraokeAI API Service
 * Connects to the local Python backend running on your PC.
 * 
 * Setup: Start the Python server with:
 *   python -m karaoke_generator.server
 * 
 * Then update BASE_URL to your PC's local IP (e.g. 192.168.1.10:8000)
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Your PC's local IP address (found from Vite network output: http://192.168.1.40:3000/)
// Both your PC and phone must be on the same WiFi network
export const API_BASE_URL = 'http://192.168.1.40:8000';

// ─── TYPES ─────────────────────────────────────────────────────────────────
export interface UploadResponse {
  jobId: string;
  message: string;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'extracting' | 'transcribing' | 'timing' | 'generating' | 'done' | 'error';
  progress: number; // 0-100
  step: string;
  estimatedSeconds: number;
  outputUrl?: string;
  error?: string;
}

// ─── API CLIENT ────────────────────────────────────────────────────────────

/**
 * Upload a video file to the backend for karaoke processing.
 * Returns a jobId to poll for status.
 */
export async function uploadVideo(
  fileUri: string,
  fileName: string,
  mimeType: string = 'video/mp4'
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`);
    
    xhr.setRequestHeader('Accept', 'application/json');
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error(`Invalid response from server: ${xhr.responseText}`));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || 'Server error'}`));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network request failed. Make sure the server is running and reachable.'));
    };
    
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);
    
    xhr.send(formData);
  });
}

/**
 * Poll the job status for a given jobId.
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE_URL}/status/${jobId}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Status check failed for job ${jobId}`);
  }

  return response.json();
}

/**
 * Get the full download URL for a completed job's output video.
 */
export function getOutputVideoUrl(jobId: string): string {
  return `${API_BASE_URL}/output/${jobId}`;
}

/**
 * Check if the backend server is reachable.
 */
export async function pingServer(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
