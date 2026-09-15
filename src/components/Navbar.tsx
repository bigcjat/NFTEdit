import React from 'react';
import { Settings, LogOut, Smartphone, RefreshCw, Palette } from 'lucide-react';

interface NavbarProps {
  account: string;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onRefreshNFTs: () => void;
  isLoading: boolean;
  onOpenXamanLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  onSignOut,
  onOpenSettings,
  onRefreshNFTs,
  isLoading,
  onOpenXamanLogin,
}) => {
  const shortenedAddress = account
    ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
    : '';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(6, 9, 19, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'var(--accent-cyan)',
              color: '#060913',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Palette size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              NFT Metadata Editor
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Edit and update URIs for your XRPL NFTs
            </p>
          </div>
        </div>

        {/* User / Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {account ? (
            <>
              {/* Refresh Button */}
              <button
                type="button"
                onClick={onRefreshNFTs}
                disabled={isLoading}
                title="Reload NFTs"
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              </button>

              {/* Connected Address Pill */}
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(0, 230, 203, 0.08)',
                  border: '1px solid rgba(0, 230, 203, 0.25)',
                  color: 'var(--accent-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {shortenedAddress}
              </div>

              {/* Settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                title="IPFS & Node Settings"
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <Settings size={16} />
              </button>

              {/* Sign Out */}
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onOpenXamanLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-cyan)',
                  color: '#060913',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <Smartphone size={16} />
                <span>Sign In with Xaman</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
