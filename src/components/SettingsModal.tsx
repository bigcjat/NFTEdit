import React, { useState } from 'react';
import type { PinataSettings, XamanSettings, XRPLNetwork } from '../types';
import { Key, Shield, HardDrive, Globe, X, Check, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  xamanSettings: XamanSettings;
  onSaveXaman: (settings: XamanSettings) => void;
  pinataSettings: PinataSettings;
  onSavePinata: (settings: PinataSettings) => void;
  network: XRPLNetwork;
  onChangeNetwork: (net: XRPLNetwork) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  xamanSettings,
  onSaveXaman,
  pinataSettings,
  onSavePinata,
  network,
  onChangeNetwork,
}) => {
  const [xamanKey, setXamanKey] = useState(xamanSettings.apiKey);
  const [xamanSecret, setXamanSecret] = useState(xamanSettings.apiSecret);
  const [pinataJwt, setPinataJwt] = useState(pinataSettings.jwt);
  const [pinataGateway, setPinataGateway] = useState(pinataSettings.gateway);
  const [relayUrl, setRelayUrl] = useState(pinataSettings.relayUrl || '');
  const [currentNet, setCurrentNet] = useState(network);

  const [pinataTestStatus, setPinataTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [relayTestStatus, setRelayTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [saveFeedback, setSaveFeedback] = useState(false);

  if (!isOpen) return null;

  const handleTestPinata = async () => {
    if (!pinataJwt.trim()) {
      alert('Please enter a Pinata JWT first.');
      return;
    }
    setPinataTestStatus('testing');
    try {
      const res = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          Authorization: `Bearer ${pinataJwt.trim()}`,
        },
      });
      if (res.ok) {
        setPinataTestStatus('success');
      } else {
        setPinataTestStatus('failed');
      }
    } catch {
      setPinataTestStatus('failed');
    }
  };

  const handleSave = () => {
    onSaveXaman({
      ...xamanSettings,
      apiKey: xamanKey.trim(),
      apiSecret: xamanSecret.trim(),
    });
    onSavePinata({
      jwt: pinataJwt.trim(),
      gateway: pinataGateway.trim(),
      relayUrl: relayUrl.trim(),
    });
    onChangeNetwork(currentNet);

    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onClose();
    }, 600);
  };

  const handleTestRelay = async () => {
    if (!relayUrl.trim()) {
      alert('Please enter a Cloudflare Worker Relay URL first.');
      return;
    }
    setRelayTestStatus('testing');
    try {
      const endpoint = relayUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${endpoint}/health`);
      if (res.ok) {
        setRelayTestStatus('success');
      } else {
        setRelayTestStatus('failed');
      }
    } catch {
      setRelayTestStatus('failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 9, 19, 0.8)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '540px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-cyan-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Platform Settings</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Client-side keys for Xaman & Pinata IPFS
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
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Network Selection */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Globe size={16} color="var(--accent-blue)" />
              XRPL Network
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentNet('mainnet')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${currentNet === 'mainnet' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  background: currentNet === 'mainnet' ? 'var(--accent-cyan-dim)' : 'rgba(255, 255, 255, 0.02)',
                  color: currentNet === 'mainnet' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Mainnet (s2.ripple.com)
              </button>
              <button
                type="button"
                onClick={() => setCurrentNet('testnet')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${currentNet === 'testnet' ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                  background: currentNet === 'testnet' ? 'var(--accent-purple-dim)' : 'rgba(255, 255, 255, 0.02)',
                  color: currentNet === 'testnet' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Testnet
              </button>
            </div>
          </div>

          {/* Xaman (XUMM) Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} color="var(--accent-cyan)" />
                Xaman (XUMM) API Credentials
              </label>
              <a
                href="https://apps.xumm.dev"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Get Keys <ExternalLink size={12} />
              </a>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Optional for direct push payloads. You can also sign client-side via QR codes and deep links without entering keys!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Xaman API Key
                </span>
                <input
                  type="text"
                  placeholder="e.g. 12345678-abcd-ef01-2345-6789abcdef01"
                  value={xamanKey}
                  onChange={(e) => setXamanKey(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Xaman API Secret
                </span>
                <input
                  type="password"
                  placeholder="e.g. 87654321-fedc-ba98-7654-3210fedcba98"
                  value={xamanSecret}
                  onChange={(e) => setXamanSecret(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Pinata IPFS Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={16} color="var(--accent-amber)" />
                Pinata IPFS Pinning Service
              </label>
              <a
                href="https://app.pinata.cloud/developers/api-keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Pinata Console <ExternalLink size={12} />
              </a>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Used to pin updated metadata JSON directly to IPFS from your browser when saving.
            </p>
            {/* Cloudflare Worker IPFS Relay Section */}
            <div style={{ marginBottom: '16px', padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 230, 203, 0.05)', border: '1px solid rgba(0, 230, 203, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} /> Cloudflare Worker IPFS Relay (Recommended)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(0, 230, 203, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  Zero Artist Login
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                Enables 1-click silent uploads for all artists using your deployed studio. Store your Pinata JWT safely in the worker secret instead of in the frontend.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="https://nftedit-ipfs-relay.<subdomain>.workers.dev"
                  value={relayUrl}
                  onChange={(e) => {
                    setRelayUrl(e.target.value);
                    setRelayTestStatus('idle');
                  }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleTestRelay}
                    disabled={relayTestStatus === 'testing'}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <RefreshCw size={11} className={relayTestStatus === 'testing' ? 'animate-spin' : ''} />
                    Test Relay Status
                  </button>
                  {relayTestStatus === 'success' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={13} /> Online & Ready!
                    </span>
                  )}
                  {relayTestStatus === 'failed' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                      Could not reach relay endpoint.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Or Personal Pinata JWT (Optional Fallback)
                </span>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={pinataJwt}
                  onChange={(e) => {
                    setPinataJwt(e.target.value);
                    setPinataTestStatus('idle');
                  }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleTestPinata}
                  disabled={pinataTestStatus === 'testing'}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={12} className={pinataTestStatus === 'testing' ? 'animate-spin' : ''} />
                  Test Pinata Token
                </button>
                {pinataTestStatus === 'success' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Verified!
                  </span>
                )}
                {pinataTestStatus === 'failed' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                    Authentication failed. Check token.
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Custom Dedicated Gateway (Optional)
                </span>
                <input
                  type="text"
                  placeholder="https://your-subdomain.mypinata.cloud/ipfs/"
                  value={pinataGateway}
                  onChange={(e) => setPinataGateway(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 <strong>Privacy Note:</strong> All API keys, secrets, and JWTs are stored strictly in your browser's private <code style={{ color: 'var(--text-primary)' }}>localStorage</code>. Nothing is sent to any external server other than the official XRPL node, Xaman API, and Pinata IPFS.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-cyan)',
              color: '#060913',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {saveFeedback ? <Check size={16} /> : null}
            {saveFeedback ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
