import { keccak256, toBytes } from "viem";

const pinataJwt = import.meta.env.VITE_PINATA_JWT;
const ipfsGateway = "https://gateway.pinata.cloud/ipfs/";

export interface AuctionMetadata {
  name: string;
  description: string;
  condition?: string;
  images: string[];
}

export function cidToBytes32(cid: string) {
  return keccak256(toBytes(cid));
}

export async function uploadMetadata(metadata: AuctionMetadata) {
  if (!pinataJwt) {
    throw new Error("VITE_PINATA_JWT not set in .env");
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `auction-${Date.now()}` },
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${await response.text()}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  return {
    cid: data.IpfsHash,
    cidBytes32: cidToBytes32(data.IpfsHash),
  };
}

export async function uploadFile(file: File) {
  if (!pinataJwt) {
    throw new Error("VITE_PINATA_JWT not set in .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata file upload failed: ${await response.text()}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

export async function fetchMetadata(cid: string) {
  const response = await fetch(`${ipfsGateway}${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from IPFS: ${cid}`);
  }
  return (await response.json()) as AuctionMetadata;
}

export function ipfsImageUrl(cid: string) {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  return `${ipfsGateway}${cid}`;
}
