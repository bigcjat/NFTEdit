import React, { useState, useEffect, useMemo } from 'react';
import type { LicenseCategory, LicensePreset } from '../types';
import { PRESET_LICENSES, filterLicenses } from '../utils/licenses';
import { 
  X, 
  Scale, 
  Search, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Palette, 
  Zap, 
  Code, 
  Edit3 
} from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLicense?: string;
  currentLicenseUrl?: string;
  onApplyLicense: (license: string, licenseUrl: string) => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  currentLicense = '',
  currentLicenseUrl = '',
  onApplyLicense,
}) => {
  const [activeCategory, setActiveCategory] = useState<LicenseCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedLicenseCode, setSelectedLicenseCode] = useState(currentLicense);
  const [selectedLicenseUrl, setSelectedLicenseUrl] = useState(currentLicenseUrl);
  
  // Custom form inputs
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLicenseCode(currentLicense);
      setSelectedLicenseUrl(currentLicenseUrl);

      // Check if current values match an existing preset
      const matched = PRESET_LICENSES.find(
        (p) => p.licenseCode === currentLicense || p.name === currentLicense
      );

      if (matched) {
        setActiveCategory(matched.category);
      } else if (currentLicense || currentLicenseUrl) {
        // If there's an existing custom license, populate custom tab
        setCustomName(currentLicense);
        setCustomUrl(currentLicenseUrl);
        setActiveCategory('custom');
      } else {
        setActiveCategory('all');
      }
      setSearchQuery('');
    }
  }, [isOpen, currentLicense, currentLicenseUrl]);

  // Filtered preset list
  const filteredPresets = useMemo(() => {
    return filterLicenses(PRESET_LICENSES, activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const handleSelectPreset = (preset: LicensePreset) => {
    setSelectedLicenseCode(preset.licenseCode);
    setSelectedLicenseUrl(preset.licenseUrl);
  };

  const handleApply = () => {
    if (activeCategory === 'custom') {
      const code = customName.trim();
      const url = customUrl.trim();
      if (!code) return;
      onApplyLicense(code, url);
    } else {
      onApplyLicense(selectedLicenseCode, selectedLicenseUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isCustom = activeCategory === 'custom';
  const canApply = isCustom
    ? customName.trim().length > 0
    : selectedLicenseCode.trim().length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 9, 19, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 2600,
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
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060913',
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                NFT License & Rights Selector
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Set recognized legal rights and actionable deed URLs in your token metadata
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
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Navigation & Search */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(9, 14, 28, 0.6)',
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '2px',
            }}
          >
            {[
              { id: 'all', label: 'All Licenses', icon: Sparkles },
              { id: 'art', label: 'Creative Commons & Art', icon: Palette },
              { id: 'web3', label: 'Web3 & NFTs', icon: Zap },
              { id: 'code', label: 'Code & Fonts', icon: Code },
              { id: 'custom', label: 'Custom License', icon: Edit3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as LicenseCategory)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(0, 230, 203, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    border: isActive
                      ? '1px solid rgba(0, 230, 203, 0.4)'
                      : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box (Shown when not on custom tab) */}
          {!isCustom && (
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search by license name, rights tag, or keywords (e.g. commercial, attribution, CC0, sampling)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Custom License Form Tab */}
          {isCustom ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Define Custom Intellectual Property Terms
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Enter a custom license identifier and a link to your full legal terms (e.g. hosted on your official website, IPFS, GitHub, or Arweave).
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  License Name / Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MuseForge Studio License v1, Proprietary ARR, or Custom B2B"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(9, 14, 28, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Saved to metadata as <code style={{ color: 'var(--accent-cyan)' }}>"license"</code>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  License Deed / Full Terms URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://yourdomain.com/terms or ipfs://Qm..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(9, 14, 28, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Saved to metadata as <code style={{ color: 'var(--accent-cyan)' }}>"license_url"</code> (accessible by collectors & marketplaces)
                </span>
              </div>
            </div>
          ) : (
            /* Preset License Cards Grid */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredPresets.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  No licenses match "{searchQuery}". Try selecting another category or customize your own license.
                </div>
              ) : (
                filteredPresets.map((preset) => {
                  const isSelected = selectedLicenseCode === preset.licenseCode;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(0, 230, 203, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {preset.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: isSelected ? 'rgba(0, 230, 203, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                              }}
                            >
                              {preset.rightsTag}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                            Code: {preset.licenseCode}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {preset.deedUrl && (
                            <a
                              href={preset.deedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                color: 'var(--accent-cyan)',
                                textDecoration: 'none',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(0, 230, 203, 0.08)',
                              }}
                              title="Read complete legal deed in a new tab"
                            >
                              <span>Legal Deed</span>
                              <ExternalLink size={12} />
                            </a>
                          )}

                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: isSelected ? '2px solid var(--accent-cyan)' : '2px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                              color: '#060913',
                            }}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {preset.summary}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer with Metadata JSON Preview & Apply Action */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(9, 14, 28, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Metadata preview snippet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '440px', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Metadata JSON Output:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: canApply ? 'var(--accent-cyan)' : 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                license: "{isCustom ? customName || 'None' : selectedLicenseCode || 'None'}"
              </span>
              {((isCustom && customUrl) || (!isCustom && selectedLicenseUrl)) && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '220px',
                  }}
                  title={isCustom ? customUrl : selectedLicenseUrl}
                >
                  (url: {isCustom ? customUrl : selectedLicenseUrl})
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-md)',
                background: canApply
                  ? 'linear-gradient(135deg, #00e6cb 0%, #38bdf8 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: canApply ? '#060913' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                cursor: canApply ? 'pointer' : 'not-allowed',
                boxShadow: canApply ? '0 4px 15px rgba(0, 230, 203, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Apply License
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
