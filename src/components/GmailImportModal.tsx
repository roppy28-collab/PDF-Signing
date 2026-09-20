import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  RefreshCw,
  FileText,
  Download,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  initAuth,
  isGoogleApiConfigured,
} from '../utils/googleAuth';
import {
  listGmailPdfAttachments,
  downloadGmailAttachment,
  GmailAttachmentItem,
} from '../utils/gmailApi';

interface GmailImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPdfSelected: (bytes: Uint8Array, filename: string) => void;
  onShowToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const GmailImportModal: React.FC<GmailImportModalProps> = ({
  isOpen,
  onClose,
  onPdfSelected,
  onShowToast,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [items, setItems] = useState<GmailAttachmentItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch email attachments when modal is opened and user is logged in
  useEffect(() => {
    if (isOpen && googleUser) {
      fetchAttachments();
    }
  }, [isOpen, googleUser]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        onShowToast(`Connected to ${result.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setItems([]);
      onShowToast('Signed out of Google account', 'info');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const fetchAttachments = async () => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage('Google authorization token not found. Please sign in again.');
      return;
    }

    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const list = await listGmailPdfAttachments(token, 15);
      setItems(list);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMessage(err.message || 'Failed to load PDF attachments from Gmail.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectAttachment = async (item: GmailAttachmentItem) => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage('Google authorization token not found.');
      return;
    }

    setDownloadingId(item.attachmentId);
    setErrorMessage(null);

    try {
      const bytes = await downloadGmailAttachment(token, item.messageId, item.attachmentId);
      onPdfSelected(bytes, item.filename);
      onShowToast(`Imported "${item.filename}" from Gmail!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err.message || 'Failed to download attachment from Gmail.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      id="gmail-import-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="gmail-import-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Import PDF from Gmail</h2>
              <p className="text-xs text-slate-500">
                Browse documents sent to your inbox and open directly to sign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User bar or login prompt */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs">
          {googleUser ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 truncate">
                  Inbox for: <strong className="text-slate-900">{googleUser.email}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAttachments}
                  disabled={isLoadingList}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-slate-500 ${isLoadingList ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <span className="text-slate-500">Sign in to search your Gmail for PDF attachments</span>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {!isGoogleApiConfigured() ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shadow-xs border border-slate-200 mx-auto flex items-center justify-center">
                <Mail className="w-5 h-5 text-slate-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Google API Not Configured
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Google API credentials have been removed from the application. You can upload or drag and drop any PDF file directly into the application to sign it.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs font-semibold text-xs transition-all cursor-pointer"
                >
                  Close & Drag/Drop PDF
                </button>
              </div>
            </div>
          ) : !googleUser ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 mx-auto flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Connect your Google Account
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Sign in to view emails with attached PDF documents, agreements, or contracts
                  that you can sign immediately.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl shadow-xs font-semibold text-xs transition-all active:scale-98 disabled:opacity-70 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  )}
                  <span>
                    {isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}
                  </span>
                </button>
              </div>
            </div>
          ) : isLoadingList ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Searching your Gmail for PDF attachments...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No PDF attachments found</p>
              <p className="text-[11px] text-slate-400">
                We couldn't find any recent emails in your inbox with PDF files attached.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Found {items.length} PDF documents in recent emails:
              </span>
              <div className="space-y-2">
                {items.map((item) => {
                  const isDownloading = downloadingId === item.attachmentId;
                  const sizeKb = Math.round(item.size / 1024);

                  return (
                    <div
                      key={item.attachmentId}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {item.filename}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.subject} · <span className="text-slate-400">{item.from}</span>
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sizeKb > 0 ? `${sizeKb} KB` : 'PDF'} {item.date ? `· ${item.date}` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleSelectAttachment(item)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <span>Open & Sign</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
