import React, { useState } from 'react';
import type { NFToken } from '../types';
import { resolveIPFSUrl } from '../utils/ipfs';
import { Sparkles, Lock, Copy, Check, Image as ImageIcon } from 'lucide-react';

interface NFTCardProps {
  nft: NFToken;
  onSelect: (nft: NFToken) => void;
  customGateway?: string;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onSelect, customGateway }) => {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const metadata = nft.metadata;
  const displayName = metadata?.name || `NFToken #${nft.nft_serial}`;
  const collectionName = metadata?.collection?.name || `Taxon ${nft.nft_taxon}`;
  const royaltyPercent = (nft.transfer_fee / 1000).toFixed(2);

  const imageUrl = metadata?.image ? resolveIPFSUrl(metadata.image, customGateway) : '';

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nft.nft_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => onSelect(nft)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = nft.isMutable ? 'rgba(0, 230, 203, 0.4)' : 'rgba(148, 163, 184, 0.3)';
        e.currentTarget.style.boxShadow = nft.isMutable ? 'var(--shadow-glow-cyan)' : 'var(--shadow-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-card)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top Media Area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%', // 1:1 Aspect Ratio
          backgroundColor: 'rgba(10, 15, 29, 0.9)',
          overflow: 'hidden',
        }}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayName}
            onError={() => setImageError(true)}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '8px',
            }}
          >
            <ImageIcon size={36} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {nft.metadataLoading ? 'Loading IPFS...' : 'No Preview'}
            </span>
          </div>
        )}

        {/* Floating Badges */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '6px',
            zIndex: 2,
          }}
        >
          {nft.isMutable ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(6, 9, 19, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 230, 203, 0.4)',
                color: 'var(--accent-cyan)',
                fontSize: '0.7rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
              }}
            >
              <Sparkles size={11} />
              tfMutable
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(6, 9, 19, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              <Lock size={11} />
              Immutable
            </span>
          )}
        </div>

        {/* Serial Badge */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(6, 9, 19, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            zIndex: 2,
          }}
        >
          #{nft.nft_serial}
        </div>
      </div>

      {/* Info Content */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {collectionName}
          </div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '2px',
            }}
          >
            {displayName}
          </h3>
        </div>

        {/* Details Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: 'auto',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span>Taxon: <strong style={{ color: 'var(--text-primary)' }}>{nft.nft_taxon}</strong></span>
          <span>Royalty: <strong style={{ color: 'var(--accent-amber)' }}>{royaltyPercent}%</strong></span>
        </div>

        {/* Token ID Pill with Copy */}
        <div
          onClick={handleCopyId}
          title="Click to copy NFTokenID"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>{nft.nft_id.substring(0, 10)}...{nft.nft_id.substring(nft.nft_id.length - 8)}</span>
          {copied ? <Check size={12} color="var(--accent-cyan)" /> : <Copy size={12} />}
        </div>
      </div>
    </div>
  );
};
