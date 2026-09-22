import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Laptop,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  HardDriveDownload,
  Layers,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasNativePrompt: boolean;
  onNativeInstall: () => Promise<boolean>;
  isInstalled: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  hasNativePrompt,
  onNativeInstall,
  isInstalled,
}) => {
  const [isInIframe, setIsInIframe] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      setIsInstalling(true);
      const success = await onNativeInstall();
      setIsInstalling(false);
      if (success) {
        onClose();
      }
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <Laptop className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Install PDF Signer Desktop App
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Fast standalone window &bull; 100% offline &bull; No browser clutter
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 space-y-1">
                <p className="font-semibold text-sm text-emerald-800">Application Already Installed</p>
                <p className="text-emerald-700">
                  PDF Signer is installed on your computer. You can launch it anytime from your Windows Start Menu, Desktop shortcut, or macOS Launchpad.
                </p>
              </div>
            </div>
          ) : isInIframe ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <HardDriveDownload className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-semibold text-sm text-amber-800">Open in New Tab to Install</p>
                  <p className="text-amber-700 leading-relaxed">
                    Browser security policies disable one-click app installation inside embedded preview frames. Open PDF Signer in its own browser tab to trigger desktop installation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Full Tab to Install
              </button>
            </div>
          ) : hasNativePrompt ? (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-semibold text-sm text-indigo-900">Ready to Install</p>
                  <p className="text-indigo-700 leading-relaxed">
                    Click the button below to add PDF Signer directly to your desktop or Start Menu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isInstalling ? 'Installing...' : 'Install App Now'}
              </button>
            </div>
          ) : null}

          {/* Features Highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <ShieldCheck className="w-5 h-5 text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">100% Private</p>
              <p className="text-[11px] text-slate-500">PDFs never leave your local machine</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <Zap className="w-5 h-5 text-amber-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">Offline Ready</p>
              <p className="text-[11px] text-slate-500">Works without an internet connection</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <Layers className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">Native Window</p>
              <p className="text-[11px] text-slate-500">No URL bar, tabs, or browser clutter</p>
            </div>
          </div>

          {/* Quick Manual Installation Instructions */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              How to Install in Any Browser
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  <strong className="text-slate-800">Google Chrome / Brave:</strong> Click the <strong>Install</strong> icon (<span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">⊕</span>) at the right end of the browser address bar, or click <strong>Menu (&vellip;) &gt; Cast, save and share &gt; Install PDF Signer</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  <strong className="text-slate-800">Microsoft Edge:</strong> Click the <strong>App available</strong> icon in the address bar, or select <strong>Settings (&hellip;) &gt; Apps &gt; Install PDF Signer</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  <strong className="text-slate-800">Apple Safari (iOS / Mac):</strong> Click the <strong>Share</strong> button (<span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#x2912;</span>) and tap <strong>Add to Home Screen / Add to Dock</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
