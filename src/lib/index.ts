export interface FileEntry {
  path: string;
  content: string;
  size: number;
  status: UploadStatus;
  error?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
}

export interface UploadState {
  step: 1 | 2 | 3;
  token: string;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  files: FileEntry[];
  uploadedCount: number;
  failedCount: number;
  skippedCount: number;
}

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'skipped';

export const BLOCKED_PATHS = [
  'node_modules',
  '.env',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.cache',
  '.vscode',
  '.idea',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

export const MAX_IMAGE_SIZE = 1024 * 1024;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];

export function shouldSkipFile(path: string, size: number): { skip: boolean; reason?: string } {
  const lowerPath = path.toLowerCase();
  
  for (const blocked of BLOCKED_PATHS) {
    if (lowerPath.includes(blocked.toLowerCase())) {
      return { skip: true, reason: `محظور: ${blocked}` };
    }
  }
  
  const isImage = IMAGE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
  if (isImage && size > MAX_IMAGE_SIZE) {
    return { skip: true, reason: `صورة كبيرة (> ${formatBytes(MAX_IMAGE_SIZE)})` };
  }
  
  return { skip: false };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error('فشل في جلب المستودعات. تحقق من الرمز المميز.');
  }
  
  return response.json();
}

export async function uploadFileToGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string = 'رفع ملف عبر GitHub Uploader'
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'فشل في رفع الملف');
  }
}
