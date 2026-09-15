# NFTEdit — XRPL Dynamic NFT Studio & Metadata Editor

A 100% client-side platform for creators on the **XRP Ledger (XRPL)** to inspect, audit, edit metadata, and execute **`NFTokenModify`** transactions under the **DynamicNFT** amendment.

Hosted directly on **GitHub Pages** with mobile-first responsiveness, **Xaman (XUMM)** authentication & signing, IPFS uploading, per-field character & byte counters, and syntax/breaking-character auditing.

---

## Key Features

1. **Dynamic NFT (`tfMutable`) Management**
   - Built for the XRPL **`DynamicNFT`** amendment (activated June 11, 2025).
   - Distinct badges identifying tokens with `tfMutable` (`0x0010` / 16) vs immutable tokens.
   - Generates and signs on-ledger **`NFTokenModify`** transactions.

2. **Per-Field Character & UTF-8 Byte Counter**
   - Live character count and exact UTF-8 byte calculations (`new TextEncoder().encode()`).
   - Detailed emoji & multi-byte breakdown: explains why emojis (✍️, 🦶, 🌍, 🔐) consume 4 to 8 bytes each due to Unicode variation selectors.
   - Ensures metadata does not exceed marketplace or exchange ingest byte limits.

3. **Breaking-Character & Syntax Audit**
   - Scans text fields for stray curly braces (`}` or `{`), unescaped quotes, and non-printable control characters that crash naive exchange scrapers or JSON parsers.
   - 1-Click **"Sanitize"** tool to instantly strip breaking characters.

4. **Visual & Raw JSON Editor**
   - Dual-mode editing: visual forms (Name, Description, Attributes table, Image URL, Collection) and two-way synchronized Raw JSON editor.
   - High-resolution live image preview with multiple IPFS gateway fallbacks.

5. **Xaman (XUMM) Integration**
   - **Mobile-friendly**: 1-Tap "Open in Xaman App" deep links for phones.
   - **Desktop**: Client-side QR code scanner and real-time signing listener.
   - **Instant Testnet/Local Signing**: Optional direct secret signing via `xrpl.js` for developers.

6. **IPFS Pinning**
   - Direct browser upload to **Pinata** using your personal Pinata JWT.
   - Manual CID input and 1-click JSON download for external IPFS pinning.

---

## Getting Started

### Local Development

```bash
# Clone the repository
git clone https://github.com/bigcjat/NFTEdit.git
cd NFTEdit

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
npm run build
```

The output in `dist/` is completely static and configured with relative base paths (`./`) for deployment on GitHub Pages.

---

## Deployment to GitHub Pages

This repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

To deploy:
1. Push code to the `main` branch of `https://github.com/bigcjat/NFTEdit`.
2. In your GitHub repository settings, go to **Settings** $\rightarrow$ **Pages**.
3. Under **Build and deployment** $\rightarrow$ **Source**, select **GitHub Actions**.
4. The workflow will automatically build and publish your site!

---

## License

MIT
