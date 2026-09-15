import React, { useState, useEffect } from 'react';
import { getFallbackGatewayUrls } from '../utils/ipfs';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';

interface IPFSImageProps {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  customGateway?: string;
}

/**
 * Resilient IPFS image component that cycles across multiple fallback gateways on error.
 */
export const IPFSImage: React.FC<IPFSImageProps> = ({
  src,
  alt,
  className,
  style,
  customGateway,
}) => {
  const [gatewayIndex, setGatewayIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasAllFailed, setHasAllFailed] = useState<boolean>(false);

  const candidateUrls = src ? getFallbackGatewayUrls(src, customGateway) : [];

  useEffect(() => {
    setGatewayIndex(0);
    setIsLoaded(false);
    setHasAllFailed(false);
  }, [src, customGateway]);

  const handleError = () => {
    if (gatewayIndex + 1 < candidateUrls.length) {
      setGatewayIndex((prev) => prev + 1);
    } else {
      setHasAllFailed(true);
    }
  };

  // If a gateway hangs on an image, automatically advance to next gateway after 4.5s
  useEffect(() => {
    if (isLoaded || hasAllFailed || !src || candidateUrls.length === 0) return;
    const timer = setTimeout(() => {
      handleError();
    }, 4500);
    return () => clearTimeout(timer);
  }, [gatewayIndex, isLoaded, hasAllFailed, src, candidateUrls.length]);

  if (!src || candidateUrls.length === 0 || hasAllFailed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          gap: '6px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <ImageIcon size={32} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>No Image</span>
      </div>
    );
  }

  const currentUrl = candidateUrls[gatewayIndex] || candidateUrls[0];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <RefreshCw size={18} className="animate-spin" style={{ opacity: 0.4 }} />
        </div>
      )}
      <img
        src={currentUrl}
        alt={alt}
        className={className}
        style={{
          ...style,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    </div>
  );
};
