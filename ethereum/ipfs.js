// src/utils/ipfs.js
// ─────────────────────────────────────────────────────────────────────────────
// IPFS helpers.
//
// WHY IPFS?
//   500-char string on-chain  ≈ 40,000 gas
//   32-byte CID on-chain      ≈    512 gas   (78× cheaper)
//
// FLOW:
//   1. Seller fills in item details on the frontend
//   2. Frontend calls uploadMetadata() → Pinata pins JSON → returns CID
//   3. Frontend calls cidToBytes32(cid) → gets bytes32
//   4. bytes32 is passed to createAuction() on-chain
//   5. When loading auctions, call bytes32ToCid(bytes32) to get the CID back,
//      then fetch the metadata from IPFS
//
// SETUP:
//   Add to .env:
//     VITE_PINATA_JWT=your_pinata_jwt_here
//   Get a free JWT at https://app.pinata.cloud (1 GB free)
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";

const PINATA_JWT    = import.meta.env.VITE_PINATA_JWT;
const IPFS_GATEWAY  = "https://gateway.pinata.cloud/ipfs/"; // or https://ipfs.io/ipfs/

// ── Upload item metadata to IPFS ─────────────────────────────────────────────

/**
 * Uploads auction item metadata to IPFS via Pinata.
 *
 * @param {Object} metadata
 * @param {string}   metadata.name        Item title
 * @param {string}   metadata.description Full description
 * @param {string[]} metadata.images      Array of IPFS CIDs for photos
 *                                        (pin photos first with uploadFile())
 * @param {string}   metadata.condition   "New" | "Like New" | "Good" | "Fair" | "Poor"
 * @returns {{ cid: string, cidBytes32: string }}
 *   cid        — raw IPFS CID string, store in your app's local state
 *   cidBytes32 — pass this to createAuction() on-chain
 */
export async function uploadMetadata(metadata) {
  if (!PINATA_JWT) throw new Error("VITE_PINATA_JWT not set in .env");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent:  metadata,
      pinataMetadata: { name: `auction-${Date.now()}` },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const { IpfsHash: cid } = await res.json();
  const cidBytes32 = cidToBytes32(cid);

  return { cid, cidBytes32 };
}

/**
 * Uploads a single image/file to IPFS via Pinata.
 * Call this for each photo before calling uploadMetadata().
 *
 * @param {File} file — browser File object from <input type="file">
 * @returns {string} IPFS CID of the uploaded file
 */
export async function uploadFile(file) {
  if (!PINATA_JWT) throw new Error("VITE_PINATA_JWT not set in .env");

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: file.name })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Pinata file upload failed: ${await res.text()}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

// ── CID ↔ bytes32 conversion ─────────────────────────────────────────────────

/**
 * Converts an IPFS CID string to bytes32 for on-chain storage.
 * We store keccak256(cid) — a fixed 32-byte fingerprint.
 * The original CID string must be kept in your frontend state / local storage.
 *
 * @param {string} cid  — e.g. "QmXyz..." or "bafybeig..."
 * @returns {string} bytes32 hex string
 */
export function cidToBytes32(cid) {
  return ethers.keccak256(ethers.toUtf8Bytes(cid));
}

/**
 * Fetches and parses auction metadata from IPFS.
 *
 * @param {string} cid — the original CID string (NOT the bytes32)
 * @returns {Object} parsed metadata JSON
 */
export async function fetchMetadata(cid) {
  const url = `${IPFS_GATEWAY}${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch metadata from IPFS: ${cid}`);
  return res.json();
}

/**
 * Returns a full IPFS gateway URL for an image CID.
 * Use this as the `src` for <img> tags.
 *
 * @param {string} cid
 * @returns {string} full URL
 */
export function ipfsImageUrl(cid) {
  if (!cid) return "";
  // If it's already a full URL, return as-is
  if (cid.startsWith("http")) return cid;
  return `${IPFS_GATEWAY}${cid}`;
}
