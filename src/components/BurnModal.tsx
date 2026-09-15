import React, { useState, useEffect } from 'react';
import type { NFToken, NFTMetadata, XRPLNetwork } from '../types';
import { buildNFTokenBurnTx } from '../utils/xrpl';
import { generateClientQRCode, getXumm } from '../utils/xaman';
import { IPFSImage } from './IPFSImage';
import { 
  X, 
  Flame, 
  AlertTriangle, 
  Check, 
  Copy, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface BurnModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFToken;
  metadata?: NFTMetadata | null;
  userAccount: string;
  network: XRPLNetwork;
  onSuccess: (burnedNftId: string, txHash: string) => void;
}

export const BurnModal: React.FC<BurnModalProps> = ({
  isOpen,
  onClose,
  nft,
  metadata,
  userAccount,
  network: _network,
  onSuccess,
}) => {
  const [step, setStep] = useState<'confirm' | 'sign' | 'complete'>('confirm');

  // Confirmation safeguards
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [typedBurnText, setTypedBurnText] = useState('');

  // Transaction & Signing State
  const [txJson, setTxJson] = useState<Record<string, any>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [copiedTx, setCopiedTx] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setConfirmCheckbox(false);
      setTypedBurnText('');
      setQrDataUrl('');
      setDeepLink('');
      setTxHash('');
      const tx = buildNFTokenBurnTx(userAccount || nft.owner || nft.issuer, nft.nft_id, nft.owner);
      setTxJson(tx);
    }
  }, [isOpen, nft, userAccount]);

  const isConfirmed = confirmCheckbox && typedBurnText.trim().toUpperCase() === 'BURN';

  const handleProceedToSign = async () => {
    if (!isConfirmed) return;
    setStep('sign');

    // Try Xaman PKCE payload signing
    try {
      const xumm = getXumm();
      const state = await xumm.state();
      if (state?.sdk) {
        const payload: any = await (state.sdk.payload.create as any)({ txjson: txJson });
        if (payload?.refs?.qr_png) {
          setQrDataUrl(payload.refs.qr_png);
          if (payload.next?.always) {
            setDeepLink(payload.next.always);
          }
          if (payload.refs.websocket_status) {
            const ws = new WebSocket(payload.refs.websocket_status);
            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.signed && data.txid) {
                  setTxHash(data.txid);
                  setStep('complete');
                  onSuccess(nft.nft_id, data.txid);
                  ws.close();
                }
              } catch (e) {
                console.error(e);
              }
            };
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Xaman PKCE signing payload fallback:', err);
    }

    // Fallback: Client-side QR code & deep link
    try {
      const qrUrl = await generateClientQRCode(JSON.stringify(txJson));
      setQrDataUrl(qrUrl);
      setDeepLink(`https://xumm.app/sign?payload=${encodeURIComponent(JSON.stringify(txJson))}`);
    } catch (e) {
      console.error(e);
    }
  };

  const displayName = metadata?.name || `NFToken Serial #${nft.nft_serial}`;

  // Safe early return after all hooks
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 9, 19, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>
                Burn NFToken
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Permanent XRP Ledger Token Destruction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {step === 'confirm' && (
            <>
              {/* Critical Warning Box */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                    WARNING: THIS ACTION CANNOT BE UNDONE!
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.5 }}>
                    Burning permanently and irreversibly destroys this NFToken on the XRP Ledger. Once signed, the token is deleted from existence and can never be restored by anyone under any circumstances.
                  </p>
                </div>
              </div>

              {/* Target Token Card */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <IPFSImage src={metadata?.image} alt={displayName} />
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <h4
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayName}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Taxon #{nft.nft_taxon} • Serial #{nft.nft_serial}
                  </p>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={nft.nft_id}
                  >
                    ID: {nft.nft_id}
                  </p>
                </div>
              </div>

              {/* Safeguard Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#ef4444' }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  I understand that burning is <strong>permanent</strong>, <strong>irreversible</strong>, and will destroy this NFToken forever.
                </span>
              </label>

              {/* Type BURN Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  To proceed, type <strong style={{ color: '#ef4444' }}>BURN</strong> in uppercase:
                </label>
                <input
                  type="text"
                  placeholder="BURN"
                  value={typedBurnText}
                  onChange={(e) => setTypedBurnText(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: typedBurnText.trim().toUpperCase() === 'BURN'
                      ? '1px solid #ef4444'
                      : '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '2px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToSign}
                  disabled={!isConfirmed}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isConfirmed ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
                    color: isConfirmed ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isConfirmed ? 'pointer' : 'not-allowed',
                    boxShadow: isConfirmed ? '0 0 20px -3px rgba(239, 68, 68, 0.5)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Flame size={16} />
                  <span>Permanently Burn Token</span>
                </button>
              </div>
            </>
          )}

          {step === 'sign' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Scan with your <strong>Xaman (XUMM)</strong> app to sign the <code style={{ color: '#ef4444' }}>NFTokenBurn</code> transaction:
              </div>

              {qrDataUrl ? (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <img src={qrDataUrl} alt="Xaman QR" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>
              ) : (
                <div
                  style={{
                    width: '220px',
                    height: '220px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Scan with Xaman Wallet
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Waiting for signature to execute NFTokenBurn on XRPL...
                </p>
              </div>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    width: '100%',
                    maxWidth: '280px',
                  }}
                >
                  <ExternalLink size={14} /> Open in Xaman
                </a>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <Flame size={32} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  NFToken Successfully Burned
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  The token has been permanently destroyed on the XRP Ledger.
                </p>
              </div>

              {txHash && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TX Hash:</span>
                    <p style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {txHash.substring(0, 16)}...{txHash.substring(txHash.length - 12)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(txHash);
                      setCopiedTx(true);
                      setTimeout(() => setCopiedTx(false), 1500);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedTx ? <Check size={12} style={{ color: 'var(--accent-cyan)' }} /> : <Copy size={12} />}
                    <span>{copiedTx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
