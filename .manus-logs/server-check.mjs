// server/index.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import FormData from "form-data";
import multer from "multer";
dotenv.config();
var app = express();
var port = Number(process.env.PORT || 3001);
var frontendUrl = process.env.FRONTEND_URL;
var pinataJwt = process.env.JWT_TOKEN || process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
var pinataGateway = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
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
  if (!uri) {
    throw new Error("CID is required.");
  }
  if (uri.startsWith("ipfs://")) {
    return uri.slice("ipfs://".length);
  }
  return uri;
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
  form.append("file", file.buffer, {
    filename: file.originalname || "auction-image",
    contentType: file.mimetype || "application/octet-stream",
    knownLength: file.size
  });
  const response = await pinataFetch("/pinning/pinFileToIPFS", {
    method: "POST",
    body: form,
    headers: form.getHeaders()
  });
  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
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
  const response = await fetch(`${pinataGateway}/${cid}`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Gateway request failed with status ${response.status}`);
  }
  return response;
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
