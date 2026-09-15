import React, { useState, useEffect } from 'react';
import type { XamanSettings } from '../types';
import { createXamanSignInPayload, generateClientQRCode, subscribeToXamanPayload } from '../utils/xaman';
import { X, Smartphone, RefreshCw, ArrowRight } from 'lucide-react';

interface XamanLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: string) => void;
  xamanSettings: XamanSettings;
}

export const XamanLoginModal: React.FC<XamanLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  xamanSettings,
}) => {
  if (!isOpen) return null;

  const DEMO_ACCOUNT = 'rEGdtVbJp2FEcEd39pAZqkUXi3REwwdFvC';

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initSignIn() {
      setIsLoading(true);

      // If Xaman credentials are configured
      if (xamanSettings.apiKey && xamanSettings.apiSecret) {
        try {
          const payload = await createXamanSignInPayload(xamanSettings.apiKey, xamanSettings.apiSecret);
          if (payload?.refs?.qr_png) {
            setQrCodeUrl(payload.refs.qr_png);
            if (payload.next?.always) {
              setDeepLink(payload.next.always);
            }
            if (payload.refs.websocket_status) {
              unsubscribe = subscribeToXamanPayload(
                payload.refs.websocket_status,
                (data) => {
                  if (data.signed && data.account) {
                    onLoginSuccess(data.account);
                    onClose();
                  }
                },
                (err) => console.error(err)
              );
            }
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Xaman API sign in payload failed, generating client QR fallback:', e);
        }
      }

      // Fallback: Generate Client-side QR of SignIn Tx
      try {
        const signInTx = { TransactionType: 'SignIn' };
        const qr = await generateClientQRCode(JSON.stringify(signInTx));
        setQrCodeUrl(qr);
        setDeepLink(`https://xumm.app/sign?payload=${encodeURIComponent(JSON.stringify(signInTx))}`);
      } catch (err) {
        console.error('QR code generation failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSignIn();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, xamanSettings]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAddress.trim()) {
      onLoginSuccess(manualAddress.trim());
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 16, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            color: 'var(--text-muted)',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#060913',
              margin: '0 auto 12px auto',
            }}
          >
            <Smartphone size={24} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Connect with Xaman</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Scan the QR code with your Xaman app or tap to open on mobile
          </p>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '14px',
              background: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              display: 'inline-block',
            }}
          >
            {isLoading ? (
              <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={28} color="#0f172a" className="animate-spin" />
              </div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Xaman Sign In QR" style={{ width: '200px', height: '200px', display: 'block' }} />
            ) : null}
          </div>

          {/* Deep link button for mobile */}
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                color: '#060913',
                fontWeight: 600,
                fontSize: '0.88rem',
                textDecoration: 'none',
                width: '100%',
                maxWidth: '260px',
              }}
            >
              <Smartphone size={16} />
              Open in Xaman App
            </a>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>OR QUICK ACCESS</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Demo Account 1-Click */}
        <button
          type="button"
          onClick={() => {
            onLoginSuccess(DEMO_ACCOUNT);
            onClose();
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 230, 203, 0.08)',
            border: '1px solid rgba(0, 230, 203, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              Load Demo Creator Account
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Vincent Van Togh (rEGdtVbJp...FvC)
            </div>
          </div>
          <ArrowRight size={16} color="var(--accent-cyan)" />
        </button>

        {/* Manual Address Input */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Or paste any XRPL Creator Address:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="r..."
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                background: 'var(--accent-blue)',
                color: '#060913',
                fontWeight: 600,
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
              }}
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
