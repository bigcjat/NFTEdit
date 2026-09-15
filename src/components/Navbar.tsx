import React, { useState } from 'react';
import { Settings, Wallet, Globe, Sparkles, RefreshCw, Smartphone, ChevronDown, Check } from 'lucide-react';
import type { XRPLNetwork } from '../types';

interface NavbarProps {
  account: string;
  onSelectAccount: (acc: string) => void;
  network: XRPLNetwork;
  onOpenSettings: () => void;
  onRefreshNFTs: () => void;
  isLoading: boolean;
  onOpenXamanLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  onSelectAccount,
  network,
  onOpenSettings,
  onRefreshNFTs,
  isLoading,
  onOpenXamanLogin,
}) => {
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [customAddressInput, setCustomAddressInput] = useState('');

  const shortenedAddress = account
    ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
    : 'Not Connected';

  const DEMO_ACCOUNT = 'rEGdtVbJp2FEcEd39pAZqkUXi3REwwdFvC';

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddressInput.trim()) {
      onSelectAccount(customAddressInput.trim());
      setShowAddressDropdown(false);
      setCustomAddressInput('');
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(6, 9, 19, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          >
            <Sparkles size={22} color="#060913" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NFTEdit
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-cyan-dim)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(0, 230, 203, 0.3)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                tfMutable • DynamicNFT
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              XRPL Metadata & NFTokenModify Platform
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Network Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: network === 'mainnet' ? 'var(--accent-cyan)' : 'var(--accent-purple)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Globe size={13} />
            <span style={{ textTransform: 'capitalize' }}>{network} Clio</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefreshNFTs}
            disabled={isLoading || !account}
            title="Reload NFTs from XRPL"
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Account Selector / Connect */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAddressDropdown(!showAddressDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                background: account ? 'rgba(0, 230, 203, 0.08)' : 'rgba(56, 189, 248, 0.1)',
                border: `1px solid ${account ? 'rgba(0, 230, 203, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                color: account ? 'var(--accent-cyan)' : 'var(--accent-blue)',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              <Wallet size={15} />
              <span>{shortenedAddress}</span>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
            </button>

            {/* Address Switcher Dropdown */}
            {showAddressDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  maxWidth: '90vw',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.8)',
                  padding: '14px',
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Select Creator Account
                </div>

                {/* Xaman Login Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressDropdown(false);
                    onOpenXamanLogin();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <Smartphone size={15} color="var(--accent-cyan)" />
                  Sign in with Xaman App
                </button>

                {/* Demo Creator Account Option */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectAccount(DEMO_ACCOUNT);
                    setShowAddressDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: account === DEMO_ACCOUNT ? 'rgba(0, 230, 203, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${account === DEMO_ACCOUNT ? 'rgba(0, 230, 203, 0.3)' : 'transparent'}`,
                    marginBottom: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      Vincent Van Togh (Demo Creator)
                    </span>
                    {account === DEMO_ACCOUNT && <Check size={14} color="var(--accent-cyan)" />}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    rEGdtVbJp2FEcEd...FvC
                  </div>
                </button>

                {/* Manual Address Input */}
                <form onSubmit={handleCustomSubmit}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Or enter any XRPL Classic Address:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="r..."
                      value={customAddressInput}
                      onChange={(e) => setCustomAddressInput(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '6px 8px', fontFamily: 'var(--font-mono)' }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '6px 12px',
                        background: 'var(--accent-blue)',
                        color: '#060913',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0,
                      }}
                    >
                      Load
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configure Xaman, Pinata & XRPL"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
            }}
          >
            <Settings size={16} />
            <span style={{ display: 'none' }} className="tablet-show">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
