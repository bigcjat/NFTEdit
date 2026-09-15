import React, { useState, useMemo } from 'react';
import type { NFToken, XRPLNetwork } from '../types';
import { extractNFTokenIssuer, fetchNFTokenById } from '../utils/xrpl';
import { Edit3, CheckCircle2, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';

interface DirectNFTLookupProps {
  userAccount: string;
  nfts: NFToken[];
  network: XRPLNetwork;
  onSelectNFT: (nft: NFToken) => void;
}

export const DirectNFTLookup: React.FC<DirectNFTLookupProps> = ({
  userAccount,
  nfts,
  network,
  onSelectNFT,
}) => {
  const [inputNftId, setInputNftId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanId = inputNftId.trim().toUpperCase();

  // Real-time verification of the input NFTokenID
  const verification = useMemo(() => {
    if (!cleanId) return null;

    if (cleanId.length !== 64 || !/^[0-9A-F]{64}$/.test(cleanId)) {
      return {
        isValidFormat: false,
        isMintedByMe: false,
        issuer: null,
        message: 'NFTokenID must be exactly 64 hexadecimal characters.',
      };
    }

    const tokenIssuer = extractNFTokenIssuer(cleanId);
    if (!tokenIssuer) {
      return {
        isValidFormat: false,
        isMintedByMe: false,
        issuer: null,
        message: 'Could not parse token issuer from this NFTokenID.',
      };
    }

    const isMintedByMe = tokenIssuer.toLowerCase() === userAccount.trim().toLowerCase();

    return {
      isValidFormat: true,
      isMintedByMe,
      issuer: tokenIssuer,
      message: isMintedByMe
        ? 'Verified: Minted by your connected account.'
        : `Unauthorized: Minted by ${tokenIssuer}. You can only edit tokens you minted.`,
    };
  }, [cleanId, userAccount]);

  const handleOpenEditor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!verification?.isValidFormat) {
      setErrorMsg('Please enter a valid 64-character NFTokenID.');
      return;
    }

    if (!verification.isMintedByMe) {
      setErrorMsg(`You cannot edit this token. It was minted by ${verification.issuer}, not your account.`);
      return;
    }

    // 1. Check if token already loaded in memory
    const existing = nfts.find((n) => n.nft_id.toUpperCase() === cleanId);
    if (existing) {
      onSelectNFT(existing);
      return;
    }

    // 2. Fetch directly from Ripple Clio node
    setIsLoading(true);
    try {
      const fetched = await fetchNFTokenById(cleanId, network);
      if (fetched.is_burned) {
        throw new Error('This NFToken has been burned on the XRP Ledger.');
      }
      onSelectNFT(fetched);
    } catch (err: any) {
      console.error('Failed to load NFToken by ID:', err);
      setErrorMsg(err.message || 'Failed to locate this NFToken on the XRP Ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 230, 203, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <Sparkles size={16} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Jump Directly to NFTokenID
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Skip scrolling — instant edit for any token you minted
        </span>
      </div>

      <form onSubmit={handleOpenEditor} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 320px' }}>
          <input
            type="text"
            placeholder="Paste 64-character NFTokenID (e.g. 0008...)"
            value={inputNftId}
            onChange={(e) => {
              setInputNftId(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            style={{
              width: '100%',
              padding: '10px 36px 10px 14px',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(9, 14, 28, 0.8)',
              border: verification && !verification.isMintedByMe
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : verification?.isMintedByMe
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              outline: 'none',
              letterSpacing: cleanId.length > 0 ? '0.5px' : 'normal',
            }}
          />
          {inputNftId && (
            <button
              type="button"
              onClick={() => {
                setInputNftId('');
                setErrorMsg(null);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !verification?.isValidFormat || !verification?.isMintedByMe}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: verification?.isMintedByMe
              ? 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)'
              : 'rgba(255, 255, 255, 0.06)',
            color: verification?.isMintedByMe ? '#060913' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.84rem',
            border: 'none',
            cursor: verification?.isMintedByMe && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
          }}
        >
          {isLoading ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Fetching from Ledger...</span>
            </>
          ) : (
            <>
              <Edit3 size={15} />
              <span>Edit Token</span>
            </>
          )}
        </button>
      </form>

      {/* Real-time Status Badge */}
      {verification && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.76rem',
            color: verification.isMintedByMe ? 'var(--accent-emerald)' : '#f87171',
          }}
        >
          {verification.isMintedByMe ? (
            <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
          )}
          <span>{verification.message}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.76rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
