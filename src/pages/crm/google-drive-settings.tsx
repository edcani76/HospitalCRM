import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Link2, Link2Off, Copy, Check, FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DriveStatus {
  connected: boolean;
  hasFolder: boolean;
  folderId: string | null;
}

export default function GoogleDriveSettingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const success = searchParams.get('drive_success');
    const error = searchParams.get('drive_error');
    const refreshToken = searchParams.get('refresh_token');

    if (success === 'true' && refreshToken) {
      setSuccessMsg('Google Drive connected successfully! Refresh token captured.');
      setManualToken(refreshToken);
      fetchStatus();
    } else if (error) {
      const messages: Record<string, string> = {
        no_code: 'No authorization code received.',
        token_failed: 'Token exchange failed. Check your Client ID and Secret.',
        exchange_failed: 'An error occurred during token exchange.',
      };
      setErrorMsg(messages[error] || 'Authorization failed.');
    }

    if (success || error) {
      const timer = setTimeout(() => {
        navigate('/crm/settings', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/drive/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch Drive status:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    setConnecting(true);
    window.location.href = '/api/auth/google-drive/connect';
  }

  function copyToken() {
    if (manualToken) {
      navigator.clipboard.writeText(manualToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Google Drive Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure system-level Google Drive for file uploads</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{successMsg}</p>
              {manualToken && (
                <div className="mt-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">
                    Copy this refresh token and add it to your <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">.env</code> file as <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">GOOGLE_DRIVE_REFRESH_TOKEN</code>:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={manualToken}
                      className="flex-1 text-xs font-mono bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={copyToken}
                      className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connection Status</h2>

        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Checking status...</span>
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                {status.connected ? (
                  <Link2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Link2Off className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Google Drive</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {status.connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                status.connected
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {status.connected ? 'Active' : 'Inactive'}
              </span>
            </div>

            {status.connected && status.hasFolder && status.folderId && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Folder</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{status.folderId}</p>
                  </div>
                </div>
              </div>
            )}

            {!status.connected && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Google Drive is not configured</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Click the button below to authorize Google Drive. After authorization, copy the refresh token from the success message and add it to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> file. Then restart the server.
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        GOOGLE_DRIVE_REFRESH_TOKEN="paste_token_here"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    {status.connected ? 'Re-authorize Google Drive' : 'Connect Google Drive'}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Unable to load status.</p>
        )}
      </div>

      {/* Prerequisites Card */}
      <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Setup Requirements</h2>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Google Cloud Console OAuth 2.0 Client ID</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Must be configured with your application's domain as an Authorized JavaScript origin (e.g., <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</code> for development or your production URL)</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Client Secret in .env</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">GOOGLE_CLIENT_SECRET="GOCSPX-..."</code> to your .env file</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Authorize Drive Access</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click "Connect Google Drive" above, authorize, then copy the refresh token to your .env file and restart the server</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Restart Server</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">After adding the refresh token to .env, restart the dev server for changes to take effect</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
