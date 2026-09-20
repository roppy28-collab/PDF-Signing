import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Download,
  Loader2,
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
import { sendEmailViaGmail, createGmailDraft } from '../utils/gmailApi';
import {
  getOutlookLiveComposeUrl,
  getOutlookOfficeComposeUrl,
  getMailtoLink,
  downloadPdfForOutlook,
} from '../utils/outlookHelper';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes: Uint8Array | null;
  documentName: string;
  onShowToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  pdfBytes,
  documentName,
  onShowToast,
}) => {
  const googleConfigured = isGoogleApiConfigured();
  const [activeTab, setActiveTab] = useState<'gmail' | 'outlook'>(
    googleConfigured ? 'gmail' : 'outlook'
  );

  // Form State
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Send Confirmation Step
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean filename with -signed suffix
  const defaultSignedName = documentName.toLowerCase().endsWith('.pdf')
    ? documentName.replace(/\.pdf$/i, '-signed.pdf')
    : `${documentName}-signed.pdf`;

  // Initialize Auth state listener
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

  // Pre-fill subject and message when document changes
  useEffect(() => {
    if (isOpen) {
      setSubject(`Signed Document: ${documentName}`);
      setMessage(
        `Hello,\n\nPlease find attached the signed PDF document "${defaultSignedName}".\n\nKind regards,\n${
          googleUser?.displayName || 'The Signer'
        }`
      );
      setSendSuccess(null);
      setErrorMessage(null);
      setShowConfirmSend(false);
    }
  }, [isOpen, documentName, defaultSignedName, googleUser]);

  if (!isOpen || !pdfBytes) return null;

  const pdfSizeKb = Math.round(pdfBytes.byteLength / 1024);

  // Google Login handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        onShowToast(`Connected as ${result.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      onShowToast('Signed out of Google account', 'info');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Gmail Send Confirmation & Execution
  const handleRequestSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setErrorMessage('Please enter a recipient email address.');
      return;
    }
    setErrorMessage(null);
    setShowConfirmSend(true);
  };

  const handleConfirmedSend = async () => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage('Google authorization token not found. Please sign in again.');
      setShowConfirmSend(false);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      await sendEmailViaGmail(token, {
        to: toEmail.trim(),
        from: googleUser?.email || undefined,
        subject: subject.trim(),
        bodyText: message.trim(),
        attachmentName: defaultSignedName,
        attachmentBytes: pdfBytes,
      });

      setShowConfirmSend(false);
      setSendSuccess(`Email successfully sent to ${toEmail} with ${defaultSignedName} attached!`);
      onShowToast('Email sent via Gmail!', 'success');
    } catch (err: any) {
      console.error('Send error:', err);
      setErrorMessage(err.message || 'Failed to send email via Gmail.');
    } finally {
      setIsSending(false);
    }
  };

  // Gmail Draft Creation
  const handleSaveDraft = async () => {
    const token = getAccessToken();
    if (!token) {
      setErrorMessage('Google authorization token not found. Please sign in again.');
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage(null);

    try {
      await createGmailDraft(token, {
        to: toEmail.trim(),
        from: googleUser?.email || undefined,
        subject: subject.trim(),
        bodyText: message.trim(),
        attachmentName: defaultSignedName,
        attachmentBytes: pdfBytes,
      });

      setSendSuccess(`Saved as a draft in your Gmail account with ${defaultSignedName} attached.`);
      onShowToast('Draft saved to Gmail!', 'success');
    } catch (err: any) {
      console.error('Draft error:', err);
      setErrorMessage(err.message || 'Failed to create draft in Gmail.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Outlook Web Open Handler
  const handleOpenOutlookLive = () => {
    downloadPdfForOutlook(pdfBytes, defaultSignedName);
    const url = getOutlookLiveComposeUrl({
      to: toEmail.trim(),
      subject: subject.trim(),
      body: message.trim(),
    });
    window.open(url, '_blank');
    onShowToast('Opening Outlook Web & downloaded signed PDF', 'success');
  };

  const handleOpenOutlookOffice = () => {
    downloadPdfForOutlook(pdfBytes, defaultSignedName);
    const url = getOutlookOfficeComposeUrl({
      to: toEmail.trim(),
      subject: subject.trim(),
      body: message.trim(),
    });
    window.open(url, '_blank');
    onShowToast('Opening Microsoft 365 Outlook & downloaded signed PDF', 'success');
  };

  const handleOpenOutlookDesktop = () => {
    downloadPdfForOutlook(pdfBytes, defaultSignedName);
    const mailto = getMailtoLink({
      to: toEmail.trim(),
      subject: subject.trim(),
      body: message.trim(),
    });
    window.location.href = mailto;
    onShowToast('Opening desktop mail & downloaded signed PDF', 'success');
  };

  const handleCopyDetails = () => {
    const text = `To: ${toEmail}\nSubject: ${subject}\n\n${message}`;
    navigator.clipboard.writeText(text);
    onShowToast('Copied email details to clipboard!', 'info');
  };

  return (
    <div
      id="email-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="email-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Email Signed Document</h2>
              <p className="text-xs text-slate-500">Send or compose using Gmail or Outlook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Gmail vs Outlook */}
        <div className="px-6 pt-3 border-b border-slate-100 flex gap-2 bg-slate-50/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('gmail');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'gmail'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {/* Google / Gmail Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                fill="#EA4335"
                d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
            <span>Gmail</span>
            {googleUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('outlook');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'outlook'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {/* Microsoft Outlook Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                fill="#0078D4"
                d="M14.5 3H21a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6.5V3zm-2 0v18H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9.5z"
              />
            </svg>
            <span>Outlook</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Attachment Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 truncate block">
                  {defaultSignedName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Signed PDF · {pdfSizeKb} KB
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPdfForOutlook(pdfBytes, defaultSignedName)}
              className="text-[11px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1 font-medium hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3 h-3 text-slate-500" />
              Download copy
            </button>
          </div>

          {/* Success Message Banner */}
          {sendSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Operation Completed</p>
                <p>{sendSuccess}</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: GMAIL */}
          {activeTab === 'gmail' && (
            <div className="space-y-4">
              {/* If Google API is not configured */}
              {!googleConfigured ? (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 shadow-xs border border-slate-200 mx-auto flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">
                      Google API Not Configured
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Google API credentials have been removed from the application. You can use Outlook, Microsoft 365, or desktop mail to send your signed document.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('outlook')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs font-semibold text-xs transition-all cursor-pointer"
                    >
                      Switch to Outlook / Email
                    </button>
                  </div>
                </div>
              ) : !googleUser ? (
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-indigo-100 mx-auto flex items-center justify-center">
                    <Mail className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      Connect your Google Account
                    </h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Sign in to enable direct email sending and draft creation with your signed
                      document attached, with permission from your Google account.
                    </p>
                  </div>

                  {/* Official Google Sign In Button */}
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl shadow-xs font-semibold text-xs transition-all active:scale-98 disabled:opacity-70 cursor-pointer"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
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
              ) : (
                /* When Signed In to Google */
                <div className="space-y-3">
                  {/* Google User Identity Bar */}
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-600 font-medium truncate">
                        Signed in as: <strong className="text-slate-900">{googleUser.email}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign out
                    </button>
                  </div>

                  {/* Send Form */}
                  <form onSubmit={handleRequestSend} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Recipient Email (To:)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="client@example.com, manager@firm.com"
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Message Body
                      </label>
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none font-sans"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft || isSending}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSavingDraft ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Save as Gmail Draft</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSending || isSavingDraft}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-98 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send via Gmail</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTLOOK */}
          {activeTab === 'outlook' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Outlook Quick Launch</p>
                  <p className="text-blue-800/80 text-[11px] mt-0.5">
                    Clicking any Outlook option will automatically download your signed PDF and open
                    Outlook with your recipient, subject, and message pre-filled. Simply drag or attach
                    the downloaded file.
                  </p>
                </div>
              </div>

              {/* Outlook Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Email (To:)
                  </label>
                  <input
                    type="email"
                    placeholder="partner@company.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none font-sans"
                  />
                </div>

                {/* Launch options */}
                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenOutlookLive}
                      className="p-3 text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                          Outlook Web (Live / Hotmail)
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Open in personal outlook.live.com with pre-filled details
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenOutlookOffice}
                      className="p-3 text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                          Microsoft 365 (Work/School)
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Open in corporate outlook.office.com with pre-filled details
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyDetails}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Subject & Body</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenOutlookDesktop}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open in Outlook App</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explicit User Confirmation Dialog (MANDATORY per Workspace Skill for destructive/sending ops) */}
        {showConfirmSend && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center p-6 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-md w-full space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Confirm Sending via Gmail
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You are about to send an email on behalf of{' '}
                    <strong>{googleUser?.email}</strong> with{' '}
                    <strong>{defaultSignedName}</strong> attached to:
                  </p>
                  <p className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                    {toEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setShowConfirmSend(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleConfirmedSend}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Yes, Send Email</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
