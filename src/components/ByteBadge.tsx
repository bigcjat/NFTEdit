import React, { useState } from 'react';
import type { FieldAudit } from '../types';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Sparkles, Wrench } from 'lucide-react';

interface ByteBadgeProps {
  audit: FieldAudit;
  onSanitize?: () => void;
  label?: string;
  compact?: boolean;
}

export const ByteBadge: React.FC<ByteBadgeProps> = ({
  audit,
  onSanitize,
  label,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const { charCount, byteCount, graphemeCount, multiByteChars, illegalChars, warnings, isValid } = audit;
  const hasMultiByte = multiByteChars.length > 0;
  const byteDiff = byteCount - graphemeCount;

  // Determine badge tone
  let badgeColor = 'var(--text-muted)';
  let borderColor = 'var(--border-subtle)';
  let bgColor = 'rgba(255, 255, 255, 0.03)';
  let Icon = CheckCircle2;

  if (!isValid || illegalChars.length > 0) {
    badgeColor = 'var(--accent-rose)';
    borderColor = 'rgba(244, 63, 94, 0.3)';
    bgColor = 'var(--accent-rose-dim)';
    Icon = AlertCircle;
  } else if (hasMultiByte && byteDiff > 8) {
    badgeColor = 'var(--accent-amber)';
    borderColor = 'rgba(245, 158, 11, 0.3)';
    bgColor = 'var(--accent-amber-dim)';
    Icon = AlertTriangle;
  } else if (byteCount > 0) {
    badgeColor = 'var(--accent-cyan)';
    borderColor = 'rgba(0, 230, 203, 0.25)';
    bgColor = 'var(--accent-cyan-dim)';
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '2px 8px' : '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          color: badgeColor,
          fontSize: compact ? '0.75rem' : '0.8rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        title="Click to view byte & character breakdown"
      >
        <Icon size={compact ? 12 : 14} />
        {label && <span style={{ opacity: 0.8, marginRight: '2px' }}>{label}:</span>}
        <span>{charCount} chars</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span style={{ fontWeight: 600 }}>{byteCount} bytes</span>
        {hasMultiByte && (
          <span
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--accent-amber)',
              borderRadius: '4px',
              padding: '0 4px',
              fontSize: '0.7rem',
            }}
          >
            +{byteDiff}b
          </span>
        )}
        <ChevronDown
          size={12}
          style={{
            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.7,
          }}
        />
      </button>

      {/* Popover Inspector */}
      {showDetails && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            width: '320px',
            maxWidth: '90vw',
            background: '#0f172a',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
            padding: '12px 14px',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-cyan)" />
              Byte & Syntax Audit
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: isValid ? 'var(--accent-emerald-dim)' : 'var(--accent-rose-dim)',
                color: isValid ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                fontWeight: 600,
              }}
            >
              {isValid ? 'Syntax Clean' : 'Illegal Syntax'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px',
              marginBottom: '10px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Characters</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{charCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Graphemes</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{graphemeCount}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>UTF-8 Bytes</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: hasMultiByte ? 'var(--accent-amber)' : 'inherit' }}>
                {byteCount}
              </div>
            </div>
          </div>

          {/* Illegal Chars Warning */}
          {illegalChars.length > 0 && (
            <div
              style={{
                background: 'var(--accent-rose-dim)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                marginBottom: '10px',
                color: '#fecdd3',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <AlertCircle size={14} color="var(--accent-rose)" />
                Detected Breaking Characters:
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {illegalChars.map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(244, 63, 94, 0.3)',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              {onSanitize && (
                <button
                  type="button"
                  onClick={() => {
                    onSanitize();
                    setShowDetails(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    padding: '4px 8px',
                    background: 'var(--accent-rose)',
                    color: '#ffffff',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={12} />
                  Sanitize & Remove Breaking Chars
                </button>
              )}
            </div>
          )}

          {/* Multi-byte Glyph Breakdown */}
          {multiByteChars.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Multi-byte Glyphs & Emojis ({multiByteChars.length}):
              </div>
              <div
                style={{
                  maxHeight: '110px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {multiByteChars.map((mb, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1rem' }}>{mb.char}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                        {mb.codePoint}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: mb.bytes >= 4 ? 'var(--accent-amber)' : 'var(--text-primary)',
                      }}
                    >
                      {mb.bytes} bytes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
              {warnings.map((w, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  • {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
