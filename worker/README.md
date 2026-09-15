# NFTEdit Cloudflare Worker IPFS Relay

A free, lightweight serverless proxy hosted on **Cloudflare Workers**. It securely stores your **Pinata JWT** on the server side so artists using your GitHub Pages app never have to touch API keys, register for Pinata, or manage IPFS infrastructure.

---

## 🚀 2-Minute Deployment

### Step 1: Install & Login to Cloudflare
If you don't already have Wrangler installed:
```bash
cd worker
npm install
npx wrangler login
```
*(This opens your browser to authorize with your free Cloudflare account).*

---

### Step 2: Add your Pinata JWT Secret
Run:
```bash
npx wrangler secret put PINATA_JWT
```
When prompted, paste your Pinata JWT (from [pinata.cloud/keys](https://app.pinata.cloud/keys)).

---

### Step 3: Deploy
Run:
```bash
npx wrangler deploy
```
Cloudflare will output your worker URL, for example:
```
https://nftedit-ipfs-relay.<your-subdomain>.workers.dev
```

---

### Step 4: Plug it into the App
In the root directory of `NFTEdit`, create or edit `.env`:
```bash
VITE_IPFS_RELAY_URL=https://nftedit-ipfs-relay.<your-subdomain>.workers.dev
```
And deploy to GitHub Pages!

That's it! Every artist using your site now gets **1-Click silent IPFS pinning** without having to enter any credentials.
