export interface Env {
  PINATA_JWT: string;
  ALLOWED_ORIGINS?: string;
}

// Trusted domains allowed to use this relay
const DEFAULT_ALLOWED_ORIGINS = [
  'https://bigcjat.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  const custom = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()) : [];
  const allowedList = [...DEFAULT_ALLOWED_ORIGINS, ...custom];
  return allowedList.some((allowed) => origin.startsWith(allowed));
}

function getCorsHeaders(origin: string | null, env: Env) {
  const allowed = isOriginAllowed(origin, env);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : DEFAULT_ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-nftedit-client',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin, env);

    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 2. Health check (public GET)
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'XRPL Dynamic NFT IPFS Relay',
          hasPinataConfigured: !!env.PINATA_JWT,
          version: '1.1.0-protected',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Security: Origin Check on all write requests
    if (request.method === 'POST') {
      // Must come from your GitHub Pages domain or local dev
      if (origin && !isOriginAllowed(origin, env)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Unauthorized request origin.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Must include the app client verification header
      const clientHeader = request.headers.get('x-nftedit-client');
      if (clientHeader !== 'xrpl-dynamic-nft-v1') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Missing or invalid client verification header.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Ensure PINATA_JWT is configured
    if (!env.PINATA_JWT) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Worker is missing PINATA_JWT secret. Run: wrangler secret put PINATA_JWT',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Upload JSON Metadata (Strictly enforced <= 50 KB)
    if (request.method === 'POST' && (url.pathname === '/upload-json' || url.pathname === '/api/upload-json')) {
      try {
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > 50 * 1024) {
          return new Response(
            JSON.stringify({ error: 'Payload Too Large: JSON metadata must be under 50 KB.' }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json<any>();
        if (!body || typeof body !== 'object' || !body.name) {
          return new Response(
            JSON.stringify({ error: 'Invalid payload: Expected NFT metadata object with a name field.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokenName = String(body.name).substring(0, 40);
        const fileName = `${tokenName || 'metadata'}.json`;

        // 4a. Pinata V3 Files endpoint
        try {
          const jsonBlob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
          const v3Form = new FormData();
          v3Form.append('file', jsonBlob, fileName);
          v3Form.append('name', fileName);
          v3Form.append('network', 'public');

          const v3Resp = await fetch('https://uploads.pinata.cloud/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.PINATA_JWT.trim()}`,
            },
            body: v3Form,
          });

          if (v3Resp.ok) {
            const v3Data: any = await v3Resp.json();
            const cid = v3Data.data?.cid || v3Data.cid || v3Data.IpfsHash;
            if (cid) {
              return new Response(
                JSON.stringify({
                  ipfsHash: cid,
                  uri: `ipfs://${cid}`,
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          }
        } catch (v3Err) {
          console.warn('Worker: Pinata V3 upload failed, trying V1 fallback:', v3Err);
        }

        // 4b. Fallback to Legacy Pinata V1 endpoint
        const pinataPayload = {
          pinataContent: body,
          pinataMetadata: {
            name: fileName,
            keyvalues: {
              platform: 'XRPL-DynamicNFT-Editor',
              timestamp: new Date().toISOString(),
            },
          },
          pinataOptions: {
            cidVersion: 1,
          },
        };

        const pinataResp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.PINATA_JWT.trim()}`,
          },
          body: JSON.stringify(pinataPayload),
        });

        if (!pinataResp.ok) {
          const errText = await pinataResp.text();
          return new Response(
            JSON.stringify({ error: `Pinata upload error (${pinataResp.status}): ${errText}` }),
            { status: pinataResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pinataData: any = await pinataResp.json();
        const ipfsHash = pinataData.IpfsHash || pinataData.cid;

        return new Response(
          JSON.stringify({
            ipfsHash,
            uri: `ipfs://${ipfsHash}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to process JSON upload.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Upload Media File (Binary / Artwork, strictly enforced <= 100 MB and media MIME)
    if (request.method === 'POST' && (url.pathname === '/upload-file' || url.pathname === '/api/upload-file')) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return new Response(
            JSON.stringify({ error: 'Expected multipart/form-data with file' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
          return new Response(
            JSON.stringify({ error: "Missing 'file' in multipart form data." }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Security check: Allow all digital art formats (high-res images, video, audio, 3D GLB/GLTF)
        const isAllowedMedia =
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/') ||
          file.type.startsWith('model/') ||
          /\.(png|jpe?g|webp|gif|svg|tiff?|avif|mp4|webm|mov|wav|mp3|flac|ogg|glb|gltf)$/i.test(file.name);

        if (!isAllowedMedia) {
          return new Response(
            JSON.stringify({ error: 'Forbidden: Only artwork media files (images, video, audio, 3D models) are allowed.' }),
            { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Max file size: 100 MB (Cloudflare Workers platform maximum body size)
        if (file.size > 100 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'Payload Too Large: Artwork media exceeds 100 MB size limit (Cloudflare Workers maximum).' }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 5a. Try Pinata V3 Files endpoint
        try {
          const v3Form = new FormData();
          v3Form.append('file', file, file.name);
          v3Form.append('name', file.name);
          v3Form.append('network', 'public');

          const v3Resp = await fetch('https://uploads.pinata.cloud/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.PINATA_JWT.trim()}`,
            },
            body: v3Form,
          });

          if (v3Resp.ok) {
            const v3Data: any = await v3Resp.json();
            const cid = v3Data.data?.cid || v3Data.cid || v3Data.IpfsHash;
            if (cid) {
              return new Response(
                JSON.stringify({
                  ipfsHash: cid,
                  uri: `ipfs://${cid}`,
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          }
        } catch (v3Err) {
          console.warn('Worker: Pinata V3 file upload failed, trying V1 fallback:', v3Err);
        }

        // 5b. Fallback to Legacy Pinata V1 endpoint
        const forwardFormData = new FormData();
        forwardFormData.append('file', file);
        forwardFormData.append(
          'pinataMetadata',
          JSON.stringify({
            name: file.name || 'nft-artwork',
            keyvalues: {
              platform: 'XRPL-DynamicNFT-Editor',
              timestamp: new Date().toISOString(),
            },
          })
        );
        forwardFormData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

        const pinataResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.PINATA_JWT.trim()}`,
          },
          body: forwardFormData,
        });

        if (!pinataResp.ok) {
          const errText = await pinataResp.text();
          return new Response(
            JSON.stringify({ error: `Pinata file upload error (${pinataResp.status}): ${errText}` }),
            { status: pinataResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pinataData: any = await pinataResp.json();
        const ipfsHash = pinataData.IpfsHash || pinataData.cid;

        return new Response(
          JSON.stringify({
            ipfsHash,
            uri: `ipfs://${ipfsHash}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to process file upload.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
