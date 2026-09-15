export interface Env {
  PINATA_JWT: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'XRPL Dynamic NFT IPFS Relay',
          hasPinataConfigured: !!env.PINATA_JWT,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ensure PINATA_JWT is configured
    if (!env.PINATA_JWT) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Worker is missing PINATA_JWT secret. Run: wrangler secret put PINATA_JWT',
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Upload JSON Metadata
    if (request.method === 'POST' && (url.pathname === '/upload-json' || url.pathname === '/api/upload-json')) {
      try {
        const body = await request.json<any>();
        if (!body || typeof body !== 'object') {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON payload. Expected metadata object.' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        const tokenName = body.name || 'NFT Metadata';
        const pinataPayload = {
          pinataContent: body,
          pinataMetadata: {
            name: `${tokenName.substring(0, 40)}.json`,
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
            { status: pinataResp.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        const pinataData: any = await pinataResp.json();
        const ipfsHash = pinataData.IpfsHash;

        return new Response(
          JSON.stringify({
            ipfsHash,
            uri: `ipfs://${ipfsHash}`,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to process JSON upload.' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Upload Media File (Binary / Image)
    if (request.method === 'POST' && (url.pathname === '/upload-file' || url.pathname === '/api/upload-file')) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return new Response(
            JSON.stringify({ error: 'Expected multipart/form-data with file' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        // Forward multipart data directly to Pinata
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
          return new Response(
            JSON.stringify({ error: "Missing 'file' in multipart form data." }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        // Max file size: 25 MB
        if (file.size > 25 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'File exceeds 25 MB size limit.' }),
            { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

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
            { status: pinataResp.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        const pinataData: any = await pinataResp.json();
        const ipfsHash = pinataData.IpfsHash;

        return new Response(
          JSON.stringify({
            ipfsHash,
            uri: `ipfs://${ipfsHash}`,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to process file upload.' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found.' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
