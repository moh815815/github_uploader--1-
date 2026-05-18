import { useState, useCallback } from 'react';
import JSZip, { JSZipObject } from 'jszip';
import {
  FileEntry,
  GitHubRepo,
  UploadState,
  UploadStatus,
  shouldSkipFile,
  fetchUserRepos,
  uploadFileToGitHub,
  toBase64,
} from '@/lib/index';

export function useGitHubUploader() {
  const [state, setState] = useState<UploadState>({
    step: 1,
    token: '',
    repos: [],
    selectedRepo: null,
    files: [],
    uploadedCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setToken = useCallback((token: string) => {
    setState(prev => ({ ...prev, token }));
  }, []);

  const connectGitHub = useCallback(async () => {
    if (!state.token.trim()) {
      setError('الرجاء إدخال رمز GitHub المميز');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repos = await fetchUserRepos(state.token);
      setState(prev => ({ ...prev, repos }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في الاتصال بـ GitHub');
    } finally {
      setIsLoading(false);
    }
  }, [state.token]);

  const selectRepo = useCallback((repo: GitHubRepo) => {
    setState(prev => ({ ...prev, selectedRepo: repo, step: 2 }));
  }, []);

  const processZipFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const fileEntries: FileEntry[] = [];

      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        const entry = zipEntry as JSZipObject;
        if (entry.dir) continue;

        const content = await entry.async('blob');
        const size = content.size;
        const skipCheck = shouldSkipFile(path, size);

        if (skipCheck.skip) {
          fileEntries.push({
            path,
            content: '',
            size,
            status: 'skipped',
            error: skipCheck.reason,
          });
        } else {
          const base64Content = await toBase64(content as Blob);
          fileEntries.push({
            path,
            content: base64Content,
            size,
            status: 'pending',
          });
        }
      }

      setState(prev => ({
        ...prev,
        files: fileEntries,
        skippedCount: fileEntries.filter(f => f.status === 'skipped').length,
      }));
    } catch (err) {
      setError('فشل في استخراج ملف ZIP');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startUpload = useCallback(async () => {
    if (!state.selectedRepo) {
      setError('الرجاء اختيار مستودع');
      return;
    }

    setState(prev => ({ ...prev, step: 3 }));
    setError(null);

    const filesToUpload = state.files.filter(f => f.status === 'pending');
    let uploaded = 0;
    let failed = 0;

    for (const file of filesToUpload) {
      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.path === file.path ? { ...f, status: 'uploading' as UploadStatus } : f
        ),
      }));

      try {
        await uploadFileToGitHub(
          state.token,
          state.selectedRepo.owner.login,
          state.selectedRepo.name,
          file.path,
          file.content
        );

        uploaded++;
        setState(prev => ({
          ...prev,
          files: prev.files.map(f =>
            f.path === file.path ? { ...f, status: 'success' as UploadStatus } : f
          ),
          uploadedCount: uploaded,
        }));
      } catch (err) {
        failed++;
        setState(prev => ({
          ...prev,
          files: prev.files.map(f =>
            f.path === file.path
              ? {
                  ...f,
                  status: 'error' as UploadStatus,
                  error: err instanceof Error ? err.message : 'فشل الرفع',
                }
              : f
          ),
          failedCount: failed,
        }));
      }
    }
  }, [state.token, state.selectedRepo, state.files]);

  const reset = useCallback(() => {
    setState({
      step: 1,
      token: '',
      repos: [],
      selectedRepo: null,
      files: [],
      uploadedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
    setError(null);
  }, []);

  return {
    state,
    isLoading,
    error,
    setToken,
    connectGitHub,
    selectRepo,
    processZipFile,
    startUpload,
    reset,
  };
}
