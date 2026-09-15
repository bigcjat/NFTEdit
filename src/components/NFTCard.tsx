import React, { useState, useEffect, useRef } from 'react';
import type { NFToken, NFTMetadata } from '../types';
import { IPFSImage } from './IPFSImage';
import { fetchIPFSMetadata } from '../utils/ipfs';
import { Sparkles, Lock, Copy, Check, RefreshCw } from 'lucide-react';

interface NFTCardProps {
  nft: NFToken;
  onSelect: (nft: NFToken) => void;
  customGateway?: string;
  onMetadataLoaded?: (nftId: string, metadata: NFTMetadata) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  onSelect,
  customGateway,
  onMetadataLoaded,
}) => {
  const [copied, setCopied] = useState(false);
  const [localMetadata, setLocalMetadata] = useState<NFTMetadata | null>(nft.metadata || null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync if parent updates nft.metadata
  useEffect(() => {
    if (nft.metadata) {
      setLocalMetadata(nft.metadata);
    }
  }, [nft.metadata]);

  // Lazy-load metadata when card scrolls into viewport
  useEffect(() => {
    if (localMetadata || !cardRef.current || (!nft.decodedUri && !nft.nft_id)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          observer.disconnect();

          // If the decoded URI is already an image file, use it directly
          const isDirectImage =
            nft.decodedUri && /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(nft.decodedUri);
          if (isDirectImage) {
            const synthMeta: NFTMetadata = {
              name: `NFToken #${nft.nft_serial}`,
              description: '',
              image: nft.decodedUri || '',
            };
            setLocalMetadata(synthMeta);
            onMetadataLoaded?.(nft.nft_id, synthMeta);
            return;
          }

          setIsLoadingMetadata(true);
          fetchIPFSMetadata(nft.decodedUri, customGateway, nft.nft_id)
            .then((fetched) => {
              setLocalMetadata(fetched);
              onMetadataLoaded?.(nft.nft_id, fetched);
            })
            .catch(() => {
              // Leave localMetadata as null so honest fallback name/serial is shown, no fake data
            })
            .finally(() => {
              setIsLoadingMetadata(false);
            });
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [localMetadata, nft.decodedUri, nft.nft_id, customGateway, onMetadataLoaded]);

  const metadata = localMetadata || nft.metadata;
  const displayName = metadata?.name || `NFToken Serial #${nft.nft_serial}`;
  const collectionName = metadata?.collection?.name || `Taxon #${nft.nft_taxon}`;
  const royaltyPercent = (nft.transfer_fee / 1000).toFixed(2);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nft.nft_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      ref={cardRef}
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
        <div style={{ position: 'absolute', inset: 0 }}>
          {isLoadingMetadata ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                backgroundColor: 'rgba(10, 15, 29, 0.9)',
              }}
            >
              <RefreshCw size={22} className="animate-spin" style={{ opacity: 0.6 }} />
            </div>
          ) : (
            <IPFSImage
              src={metadata?.image}
              alt={displayName}
              customGateway={customGateway}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>


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
