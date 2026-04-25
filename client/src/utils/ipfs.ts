// src/utils/ipfs.js
// ─────────────────────────────────────────────────────────────────────────────
// All IPFS operations go through your Express backend (server.js).
// The browser never calls Pinata directly — this keeps your API keys safe.
// ─────────────────────────────────────────────────────────────────────────────

import { BACKEND_URL } from "../config/contract";
import { safeLog } from "./safeStringify";

const DEDICATED_GATEWAY = "https://jade-fancy-earwig-731.mypinata.cloud/ipfs";

/**
 * Helper to clean CID and return full dedicated gateway URL
 */
function getGatewayUrl(cid) {
  if (!cid) return "";
  let cleanCid = cid.toString().trim();
  if (cleanCid.startsWith("ipfs://")) {
    cleanCid = cleanCid.slice("ipfs://".length);
  }
  return `${DEDICATED_GATEWAY}/${cleanCid}`;
}

/**
 * Upload image + metadata to IPFS via your Express backend.
 * Calls POST /create-auction on your server which handles Pinata.
 *
 * @param {{
 *   name: string,
 *   description: string,
 *   condition: string,
 *   imageFile: File       ← browser File from <input type="file">
 * }} params
 *
 * @returns {{ metadataCID: string, imageCID: string }}
 *   metadataCID — pass this string directly to createAuction() on-chain
 */
export async function uploadAuctionToIPFS({ name, description, condition, imageFile }) {
  const formData = new FormData();
  formData.append("image",       imageFile);
  formData.append("name",        name);
  formData.append("description", description);
  formData.append("condition",   condition || "");

  const res = await fetch(`${BACKEND_URL}/create-auction`, {
    method: "POST",
    body:   formData,
    // Do NOT set Content-Type — browser sets it with the correct boundary
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "IPFS upload failed");
  }

  const result = await res.json();
  safeLog("upload response", result);
  return result; // { metadataCID, imageCID }
}

/**
 * Fetch auction metadata from IPFS via your backend proxy.
 * Avoids CORS issues when fetching from IPFS gateways in the browser.
 *
 * @param {string} cid  — e.g. "ipfs://QmXyz..."
 * @returns {Object}  parsed metadata JSON
 */
export async function fetchMetadata(cid) {
  if (!cid) {
    console.warn("fetchMetadata: No CID provided");
    return null;
  }

  const cleanCid = cid.toString().trim();
  const gatewayUrl = getGatewayUrl(cleanCid);
  console.log("[IPFS] Fetching metadata via proxy for CID:", cleanCid);
  console.log("[IPFS] Final Gateway URL will be:", gatewayUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(`${BACKEND_URL}/metadata?cid=${encodeURIComponent(cleanCid)}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorDetails = "";
      try {
        const errJson = await res.json();
        errorDetails = errJson.details || errJson.error || "";
      } catch {
        errorDetails = await res.text().catch(() => "Unknown error");
      }
      
      console.error(`Metadata fetch failed for ${cleanCid}:`, {
        status: res.status,
        details: errorDetails
      });
      throw new Error(`Failed to load metadata: ${res.status} ${errorDetails}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`Metadata fetch timed out for ${cleanCid}`);
      throw new Error("Metadata fetch timed out");
    }
    throw err;
  }
}

/**
 * Returns an <img src> URL for an IPFS image CID.
 * Uses your dedicated Pinata gateway directly.
 *
 * @param {string} cid  — e.g. "ipfs://QmXyz..."
 * @returns {string} URL
 */
export function ipfsImageUrl(cid) {
  if (!cid || typeof cid !== 'string' || cid.trim() === "") {
    return "";
  }
  const url = getGatewayUrl(cid);
  console.log(`[IPFS] Using Dedicated Gateway for image: ${url}`);
  return url;
}
