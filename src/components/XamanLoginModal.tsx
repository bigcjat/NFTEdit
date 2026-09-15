import React, { useState, useEffect } from 'react';
import { createXamanSignInPayload, subscribeToXamanPayload } from '../utils/xaman';
import { X, Smartphone, RefreshCw, ArrowRight } from 'lucide-react';

interface XamanLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: string) => void;
}

export const XamanLoginModal: React.FC<XamanLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  if (!isOpen) return null;

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initSignIn() {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const payload = await createXamanSignInPayload();
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
        } else {
          setErrorMsg('Could not generate Xaman sign-in payload.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error connecting to Xaman');
      } finally {
        setIsLoading(false);
      }
    }

    initSignIn();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

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
          maxWidth: '440px',
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
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#060913',
              margin: '0 auto 12px auto',
            }}
          >
            <Smartphone size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Sign In with Xaman</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Scan with the Xaman app on your phone to load your minted NFTs
          </p>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '12px',
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
            ) : (
              <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', padding: '10px', textAlign: 'center' }}>
                {errorMsg || 'Could not load QR code'}
              </div>
            )}
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
                background: 'var(--accent-cyan)',
                color: '#060913',
                fontWeight: 600,
                fontSize: '0.88rem',
                textDecoration: 'none',
                width: '100%',
                maxWidth: '260px',
              }}
            >
              <Smartphone size={16} />
              Open in Xaman Mobile App
            </a>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>OR ENTER ADDRESS DIRECTLY</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Manual Address Input */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="r..."
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span>View</span>
            <ArrowRight size={13} />
          </button>
        </form>
      </div>
    </div>
  );
};
