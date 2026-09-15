import React from 'react';
import { Layers, Search, Sparkles } from 'lucide-react';
import type { NFToken } from '../types';

interface TaxonGroup {
  taxon: number;
  count: number;
  mutableCount: number;
  collectionName?: string;
}

interface TaxonSelectorProps {
  nfts: NFToken[];
  selectedTaxon: number | 'all';
  onSelectTaxon: (taxon: number | 'all') => void;
  mutableOnly: boolean;
  onToggleMutableOnly: (val: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TaxonSelector: React.FC<TaxonSelectorProps> = ({
  nfts,
  selectedTaxon,
  onSelectTaxon,
  mutableOnly,
  onToggleMutableOnly,
  searchQuery,
  onSearchChange,
}) => {
  // Group NFTs by Taxon
  const taxonGroups: TaxonGroup[] = React.useMemo(() => {
    const map = new Map<number, { count: number; mutableCount: number; collectionName?: string }>();

    for (const nft of nfts) {
      const taxon = nft.nft_taxon;
      const existing = map.get(taxon) || { count: 0, mutableCount: 0 };
      existing.count += 1;
      if (nft.isMutable) {
        existing.mutableCount += 1;
      }
      // Extract collection name if metadata is loaded
      if (nft.metadata?.collection?.name && !existing.collectionName) {
        existing.collectionName = nft.metadata.collection.name;
      }
      map.set(taxon, existing);
    }

    return Array.from(map.entries()).map(([taxon, data]) => ({
      taxon,
      count: data.count,
      mutableCount: data.mutableCount,
      collectionName: data.collectionName,
    })).sort((a, b) => a.taxon - b.taxon);
  }, [nfts]);

  const totalMutable = nfts.filter((n) => n.isMutable).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        marginBottom: '24px',
      }}
    >
      {/* Top row: Search & Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '400px' }}>
          <Search
            size={16}
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
            placeholder="Search by Name, Taxon, Serial, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: '36px',
              paddingRight: '12px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
            }}
          />
        </div>

        {/* Toggle Mutable Only */}
        <button
          type="button"
          onClick={() => onToggleMutableOnly(!mutableOnly)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-full)',
            background: mutableOnly ? 'var(--accent-cyan-dim)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${mutableOnly ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            color: mutableOnly ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <Sparkles size={14} />
          <span>tfMutable Only</span>
          <span
            style={{
              background: mutableOnly ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
              color: mutableOnly ? '#060913' : 'var(--text-muted)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            {totalMutable}
          </span>
        </button>
      </div>

      {/* Taxon Chips List */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '4px', flexShrink: 0 }}>
          <Layers size={15} />
          <span>Taxons:</span>
        </div>

        {/* All Taxons Chip */}
        <button
          type="button"
          onClick={() => onSelectTaxon('all')}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: selectedTaxon === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${selectedTaxon === 'all' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
            color: selectedTaxon === 'all' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          <span>All Taxons</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
            }}
          >
            {nfts.length}
          </span>
        </button>

        {/* Individual Taxon Chips */}
        {taxonGroups.map((group) => {
          const isSelected = selectedTaxon === group.taxon;
          return (
            <button
              key={group.taxon}
              type="button"
              onClick={() => onSelectTaxon(group.taxon)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(0, 230, 203, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Taxon #{group.taxon}</span>
                  {group.mutableCount > 0 && (
                    <span
                      title={`${group.mutableCount} mutable token(s)`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-cyan)',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </div>
                {group.collectionName && (
                  <span style={{ fontSize: '0.68rem', color: isSelected ? '#ffffff' : 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.collectionName}
                  </span>
                )}
              </div>
              <span
                style={{
                  background: isSelected ? 'var(--accent-cyan-dim)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {group.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
