// server/index.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
dotenv.config();
var app = express();
var port = Number(process.env.PORT || 3001);
var frontendUrl = process.env.FRONTEND_URL;
var pinataJwt = process.env.JWT_TOKEN || process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
var pinataGateway = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
var fallbackGateways = [
  pinataGateway,
  "https://cloudflare-ipfs.com/ipfs",
  "https://ipfs.io/ipfs"
];
if (!pinataJwt) {
  console.warn("Pinata JWT is not configured. IPFS routes will fail until JWT_TOKEN or PINATA_JWT is set.");
}
app.use(
  cors({
    origin: frontendUrl || true
  })
);
app.use(express.json({ limit: "2mb" }));
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});
function requirePinataJwt() {
  if (!pinataJwt) {
    throw new Error("Pinata JWT is missing on the server.");
  }
  return pinataJwt;
}
function extractCid(uri) {
  const value = uri.trim();
  if (!value) {
    throw new Error("CID is required.");
  }
  if (value.startsWith("ipfs://")) {
    return value.slice("ipfs://".length);
  }
  return value.replace(/^\/?ipfs\//, "");
}
async function pinataFetch(path, init) {
  const jwt = requirePinataJwt();
  const response = await fetch(`https://api.pinata.cloud${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...init?.headers || {}
    }
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Pinata request failed with status ${response.status}`);
  }
  return response;
}
async function uploadImageToIPFS(file) {
  const form = new FormData();
  const blob = new Blob(
    [file.buffer],
    {
      type: file.mimetype || "application/octet-stream"
    }
  );
  form.append(
    "file",
    blob,
    file.originalname || "auction-image"
  );
  const response = await pinataFetch(
    "/pinning/pinFileToIPFS",
    {
      method: "POST",
      body: form
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Pinata upload failed: ${text}`
    );
  }
  return response.json();
}
async function uploadMetadataToIPFS(metadata) {
  const response = await pinataFetch("/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });
  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}
async function fetchFromGateway(cidOrUri) {
  const cid = extractCid(cidOrUri);
  const errors = [];
  for (const gateway of fallbackGateways) {
    try {
      const response = await fetch(`${gateway.replace(/\/+$/, "")}/${cid}`);
      if (!response.ok) {
        const details = await response.text();
        errors.push(`${gateway}: ${details || `status ${response.status}`}`);
        continue;
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${gateway}: ${message}`);
    }
  }
  throw new Error(errors.join(" | ") || "Gateway request failed");
}
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "auction-backend" });
});
app.post("/create-auction", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { name, description, condition } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }
    const imageCID = await uploadImageToIPFS(req.file);
    const metadataCID = await uploadMetadataToIPFS({
      name,
      description,
      condition: condition || "",
      image: imageCID
    });
    return res.json({ metadataCID, imageCID });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPFS upload failed";
    console.error("create-auction failed:", message);
    return res.status(500).json({ error: "IPFS upload failed", details: message });
  }
});
app.get("/metadata", async (req, res) => {
  try {
    const cid = String(req.query.cid || "");
    const response = await fetchFromGateway(cid);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      const body = await response.text();
      throw new Error(`Metadata response was not JSON (${contentType || "unknown content type"}): ${body.slice(0, 200)}`);
    }
    const metadata = await response.json();
    return res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata fetch failed";
    console.error("metadata fetch failed:", message);
    return res.status(500).json({ error: "Metadata fetch failed", details: message });
  }
});
app.get("/auction-image", async (req, res) => {
  try {
    const cid = String(req.query.cid || "");
    const response = await fetchFromGateway(cid);
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const arrayBuffer = await response.arrayBuffer();
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image fetch failed";
    console.error("auction-image failed:", message);
    return res.status(500).json({ error: "Image fetch failed", details: message });
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
