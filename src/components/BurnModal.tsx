import React, { useState, useEffect } from 'react';
import type { NFToken, NFTMetadata, XRPLNetwork } from '../types';
import { buildNFTokenBurnTx, CLIO_ENDPOINTS } from '../utils/xrpl';
import { generateClientQRCode, getXumm } from '../utils/xaman';
import { IPFSImage } from './IPFSImage';
import { 
  X, 
  Flame, 
  AlertTriangle, 
  Check, 
  Copy, 
  Smartphone, 
  Key, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Client, Wallet } from 'xrpl';

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
  network,
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
  const [signMethod, setSignMethod] = useState<'xaman' | 'secret'>('xaman');
  const [secretKey, setSecretKey] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
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
      setBroadcastError(null);
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

  const handleSignWithSecret = async () => {
    if (!secretKey.trim()) {
      setBroadcastError('Please enter the family seed / secret for the account.');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);

    let client: Client | null = null;
    try {
      const endpoints = CLIO_ENDPOINTS[network];
      client = new Client(endpoints[0]);
      await client.connect();

      const wallet = Wallet.fromSeed(secretKey.trim());
      const prepared = await client.autofill(txJson as any);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      const meta = result.result.meta;
      const engineResult = typeof meta === 'object' && meta !== null ? (meta as any).TransactionResult : '';

      if (engineResult === 'tesSUCCESS') {
        const hash = result.result.hash;
        setTxHash(hash);
        setStep('complete');
        onSuccess(nft.nft_id, hash);
      } else {
        throw new Error(`XRPL Transaction failed with code: ${engineResult}`);
      }
    } catch (err: any) {
      console.error('Burn transaction error:', err);
      setBroadcastError(err.message || 'Failed to broadcast NFTokenBurn transaction.');
    } finally {
      setIsBroadcasting(false);
      if (client) {
        try {
          await client.disconnect();
        } catch (_) {}
      }
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
            <>
              {/* Method Switcher */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-md)',
                  padding: '3px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSignMethod('xaman')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    backgroundColor: signMethod === 'xaman' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: signMethod === 'xaman' ? '#f87171' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Smartphone size={14} /> Xaman App
                </button>
                <button
                  type="button"
                  onClick={() => setSignMethod('secret')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    backgroundColor: signMethod === 'secret' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: signMethod === 'secret' ? '#f87171' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Key size={14} /> Seed / Secret Key
                </button>
              </div>

              {signMethod === 'xaman' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
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
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} /> Open in Xaman
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Account Family Seed / Secret:
                    </label>
                    <input
                      type="password"
                      placeholder="sEd..."
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {broadcastError && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.8rem',
                      }}
                    >
                      {broadcastError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSignWithSecret}
                    disabled={isBroadcasting || !secretKey.trim()}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isBroadcasting ? 'rgba(255, 255, 255, 0.08)' : '#ef4444',
                      color: isBroadcasting ? 'var(--text-muted)' : '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isBroadcasting || !secretKey.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isBroadcasting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Broadcasting NFTokenBurn...</span>
                      </>
                    ) : (
                      <>
                        <Flame size={16} />
                        <span>Sign & Broadcast Burn</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
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
