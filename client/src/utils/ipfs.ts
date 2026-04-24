// src/utils/ipfs.js
// ─────────────────────────────────────────────────────────────────────────────
// All IPFS operations go through your Express backend (server.js).
// The browser never calls Pinata directly — this keeps your API keys safe.
// ─────────────────────────────────────────────────────────────────────────────

import { BACKEND_URL } from "../config/contract";

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
  console.log("upload response", result);
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
  if (!cid) return null;

  console.log("fetchMetadata cid", cid);
  const res = await fetch(`${BACKEND_URL}/metadata?cid=${encodeURIComponent(cid)}`);
  if (!res.ok) throw new Error(`Failed to load metadata for ${cid}`);
  return res.json();
}

/**
 * Returns an <img src> URL for an IPFS image CID.
 * Routes through your backend proxy to avoid CORS issues.
 *
 * @param {string} cid  — e.g. "ipfs://QmXyz..."
 * @returns {string} URL
 */
export function ipfsImageUrl(cid) {
  if (!cid) return "";
  return `${BACKEND_URL}/auction-image?cid=${encodeURIComponent(cid)}`;
}
