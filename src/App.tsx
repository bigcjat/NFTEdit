import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { NFToken, NFTMetadata, PinataSettings, XamanSettings, XRPLNetwork } from './types';
import { fetchAccountNFTs } from './utils/xrpl';
import { fetchIPFSMetadata } from './utils/ipfs';
import { Navbar } from './components/Navbar';
import { TaxonSelector } from './components/TaxonSelector';
import { NFTCard } from './components/NFTCard';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { ModifyModal } from './components/ModifyModal';
import { SettingsModal } from './components/SettingsModal';
import { XamanLoginModal } from './components/XamanLoginModal';
import { Sparkles, Layers, RefreshCw, Smartphone, AlertCircle } from 'lucide-react';

const DEFAULT_DEMO_ACCOUNT = 'rEGdtVbJp2FEcEd39pAZqkUXi3REwwdFvC';

export function App() {
  // Account & Network
  const [account, setAccount] = useState<string>(() => {
    return localStorage.getItem('xrpl_user_account') || DEFAULT_DEMO_ACCOUNT;
  });
  const [network, setNetwork] = useState<XRPLNetwork>(() => {
    return (localStorage.getItem('xrpl_network') as XRPLNetwork) || 'mainnet';
  });

  // Settings
  const [xamanSettings, setXamanSettings] = useState<XamanSettings>(() => {
    const defaultKey = import.meta.env.VITE_XAMAN_API_KEY || '16c555db-35ce-4b84-a656-53b2ec76b5bc';
    const saved = localStorage.getItem('xrpl_xaman_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.apiKey && defaultKey) {
        parsed.apiKey = defaultKey;
      }
      return parsed;
    }
    return { apiKey: defaultKey, apiSecret: '', userAddress: '', isConnected: false };
  });

  const [pinataSettings, setPinataSettings] = useState<PinataSettings>(() => {
    const saved = localStorage.getItem('xrpl_pinata_settings');
    return saved ? JSON.parse(saved) : { jwt: '', gateway: 'https://gateway.pinata.cloud/ipfs/' };
  });

  // NFT State
  const [nfts, setNfts] = useState<NFToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [selectedTaxon, setSelectedTaxon] = useState<number | 'all'>('all');
  const [mutableOnly, setMutableOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedNFT, setSelectedNFT] = useState<NFToken | null>(null);
  const [modifyTarget, setModifyTarget] = useState<{ nft: NFToken; updatedMetadata: NFTMetadata } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Persist account
  useEffect(() => {
    localStorage.setItem('xrpl_user_account', account);
  }, [account]);

  // Persist network
  useEffect(() => {
    localStorage.setItem('xrpl_network', network);
  }, [network]);

  // Save Settings Handlers
  const handleSaveXaman = (settings: XamanSettings) => {
    setXamanSettings(settings);
    localStorage.setItem('xrpl_xaman_settings', JSON.stringify(settings));
    if (settings.userAddress && settings.userAddress !== account) {
      setAccount(settings.userAddress);
    }
  };

  const handleSavePinata = (settings: PinataSettings) => {
    setPinataSettings(settings);
    localStorage.setItem('xrpl_pinata_settings', JSON.stringify(settings));
  };

  // Fetch NFTs
  const loadNFTs = useCallback(async () => {
    if (!account) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const fetched = await fetchAccountNFTs(account, network);
      setNfts(fetched);

      // Concurrently fetch metadata for each NFT
      fetched.forEach(async (nft) => {
        if (nft.decodedUri) {
          try {
            const meta = await fetchIPFSMetadata(nft.decodedUri, pinataSettings.gateway);
            setNfts((prev) =>
              prev.map((item) => (item.nft_id === nft.nft_id ? { ...item, metadata: meta, metadataLoading: false } : item))
            );
          } catch {
            setNfts((prev) =>
              prev.map((item) =>
                item.nft_id === nft.nft_id ? { ...item, metadataError: 'Failed to resolve IPFS', metadataLoading: false } : item
              )
            );
          }
        }
      });
    } catch (err: any) {
      console.error('Failed to load NFTs:', err);
      setLoadError(err.message || 'Could not fetch NFTs for this account. Ensure address is valid.');
    } finally {
      setIsLoading(false);
    }
  }, [account, network, pinataSettings.gateway]);

  useEffect(() => {
    loadNFTs();
  }, [loadNFTs]);

  // Handle successful modification
  const handleModifySuccess = (newUri: string, _txHash: string) => {
    if (modifyTarget) {
      setNfts((prev) =>
        prev.map((item) =>
          item.nft_id === modifyTarget.nft.nft_id
            ? { ...item, decodedUri: newUri, metadata: modifyTarget.updatedMetadata }
            : item
        )
      );
      if (selectedNFT?.nft_id === modifyTarget.nft.nft_id) {
        setSelectedNFT((prev) =>
          prev ? { ...prev, decodedUri: newUri, metadata: modifyTarget.updatedMetadata } : null
        );
      }
    }
  };

  // Filtered NFTs
  const filteredNFTs = useMemo(() => {
    return nfts.filter((nft) => {
      // Taxon filter
      if (selectedTaxon !== 'all' && nft.nft_taxon !== selectedTaxon) {
        return false;
      }
      // Mutable filter
      if (mutableOnly && !nft.isMutable) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = nft.metadata?.name?.toLowerCase().includes(query);
        const taxonMatch = nft.nft_taxon.toString().includes(query);
        const serialMatch = nft.nft_serial.toString().includes(query);
        const idMatch = nft.nft_id.toLowerCase().includes(query);
        if (!nameMatch && !taxonMatch && !serialMatch && !idMatch) {
          return false;
        }
      }
      return true;
    });
  }, [nfts, selectedTaxon, mutableOnly, searchQuery]);

  // Statistics
  const totalNFTs = nfts.length;
  const mutableCount = nfts.filter((n) => n.isMutable).length;
  const uniqueTaxons = new Set(nfts.map((n) => n.nft_taxon)).size;

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        account={account}
        onSelectAccount={setAccount}
        network={network}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshNFTs={loadNFTs}
        isLoading={isLoading}
        onOpenXamanLogin={() => setIsLoginOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Hero Stats */}
        <div className="stats-hero-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
              <Layers size={22} />
            </div>
            <div>
              <div className="stat-val">{totalNFTs}</div>
              <div className="stat-label">Total NFTs Issued / Owned</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div className="stat-val">{mutableCount}</div>
              <div className="stat-label">Dynamic NFTs (tfMutable Enabled)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
              <Layers size={22} />
            </div>
            <div>
              <div className="stat-val">{uniqueTaxons}</div>
              <div className="stat-label">Unique Taxon Collections</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-dim)', color: 'var(--accent-emerald)' }}>
              <Smartphone size={22} />
            </div>
            <div>
              <div className="stat-val">Xaman</div>
              <div className="stat-label">DynamicNFT Amendment Supported</div>
            </div>
          </div>
        </div>

        {/* Taxon & Filter Controls */}
        <TaxonSelector
          nfts={nfts}
          selectedTaxon={selectedTaxon}
          onSelectTaxon={setSelectedTaxon}
          mutableOnly={mutableOnly}
          onToggleMutableOnly={setMutableOnly}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Load Error Alert */}
        {loadError && (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={loadNFTs}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(244, 63, 94, 0.2)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && nfts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              gap: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={36} color="var(--accent-cyan)" className="animate-spin" />
            <span style={{ fontSize: '0.95rem' }}>Querying XRPL Clio node for account NFTs...</span>
          </div>
        ) : filteredNFTs.length === 0 ? (
          /* Empty State */
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <Sparkles size={40} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>No NFTs Match Current Criteria</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '450px' }}>
              {mutableOnly
                ? 'No tokens in this selection have tfMutable enabled. Try disabling the tfMutable-only filter.'
                : 'No NFTs found for this account or taxon. Try switching taxons or loading another creator account.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTaxon('all');
                setMutableOnly(false);
                setSearchQuery('');
              }}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 230, 203, 0.3)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* NFT Grid */
          <div className="nft-grid">
            {filteredNFTs.map((nft) => (
              <NFTCard
                key={nft.nft_id}
                nft={nft}
                onSelect={(selected) => setSelectedNFT(selected)}
                customGateway={pinataSettings.gateway}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedNFT && (
        <MetadataEditorModal
          nft={selectedNFT}
          isOpen={!!selectedNFT}
          onClose={() => setSelectedNFT(null)}
          onProceedToSign={(updatedMeta) => {
            setModifyTarget({ nft: selectedNFT, updatedMetadata: updatedMeta });
            setSelectedNFT(null);
          }}
          customGateway={pinataSettings.gateway}
        />
      )}

      {modifyTarget && (
        <ModifyModal
          isOpen={!!modifyTarget}
          onClose={() => setModifyTarget(null)}
          nft={modifyTarget.nft}
          updatedMetadata={modifyTarget.updatedMetadata}
          userAccount={account}
          pinataSettings={pinataSettings}
          xamanSettings={xamanSettings}
          network={network}
          onSuccess={handleModifySuccess}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        xamanSettings={xamanSettings}
        onSaveXaman={handleSaveXaman}
        pinataSettings={pinataSettings}
        onSavePinata={handleSavePinata}
        network={network}
        onChangeNetwork={setNetwork}
      />

      <XamanLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(acc) => {
          setAccount(acc);
          setIsLoginOpen(false);
        }}
        xamanSettings={xamanSettings}
      />
    </div>
  );
}

export default App;
