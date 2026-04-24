import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import multer from "multer";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL;
const pinataJwt = process.env.JWT_TOKEN || process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
const pinataGateway = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
const fallbackGateways = [
  pinataGateway,
  "https://cloudflare-ipfs.com/ipfs",
  "https://ipfs.io/ipfs",
];

if (!pinataJwt) {
  console.warn("Pinata JWT is not configured. IPFS routes will fail until JWT_TOKEN or PINATA_JWT is set.");
}

app.use(
  cors({
    origin: frontendUrl || true,
  }),
);
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function requirePinataJwt() {
  if (!pinataJwt) {
    throw new Error("Pinata JWT is missing on the server.");
  }
  return pinataJwt;
}

function extractCid(uri: string) {
  const value = uri.trim();

  if (!value) {
    throw new Error("CID is required.");
  }

  if (value.startsWith("ipfs://")) {
    return value.slice("ipfs://".length);
  }

  return value.replace(/^\/?ipfs\//, "");
}

async function pinataFetch(path: string, init?: RequestInit) {
  const jwt = requirePinataJwt();
  const response = await fetch(`https://api.pinata.cloud${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Pinata request failed with status ${response.status}`);
  }

  return response;
}

async function uploadImageToIPFS(file: Express.Multer.File) {
  const form = new FormData();

  const blob = new Blob(
    [file.buffer],
    {
      type:
        file.mimetype ||
        "application/octet-stream",
    }
  );

  form.append(
    "file",
    blob,
    file.originalname ||
      "auction-image"
  );

  const response = await pinataFetch(
    "/pinning/pinFileToIPFS",
    {
      method: "POST",

      body: form,
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Pinata upload failed: ${text}`
    );
  }

  const data = (await response.json()) as { IpfsHash: string };
  console.log("upload image response", data);
  return `ipfs://${data.IpfsHash}`;
}

async function uploadMetadataToIPFS(metadata: Record<string, unknown>) {
  const response = await pinataFetch("/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });
  const data = (await response.json()) as { IpfsHash: string };
  console.log("upload metadata response", data);
  return `ipfs://${data.IpfsHash}`;
}

async function fetchFromGateway(cidOrUri: string) {
  const cid = extractCid(cidOrUri);
  const errors: string[] = [];
  console.log("fetchFromGateway input", { cidOrUri, cid });

  for (const gateway of fallbackGateways) {
    const url = `${gateway.replace(/\/+$/, "")}/${cid}`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        const details = await response.text();
        errors.push(`${url}: ${details || `status ${response.status}`}`);
        continue;
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${url}: ${message}`);
    }
  }

  throw new Error(errors.join(" | ") || "Gateway request failed");
}

app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "auction-backend" });
});

app.post("/create-auction", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { name, description, condition } = req.body as {
      name?: string;
      description?: string;
      condition?: string;
    };

    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }

    const imageCID = await uploadImageToIPFS(req.file);
    const metadataCID = await uploadMetadataToIPFS({
      name,
      description,
      condition: condition || "",
      image: imageCID,
    });
    console.log("create-auction cids", { imageCID, metadataCID });

    return res.json({ metadataCID, imageCID });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPFS upload failed";
    console.error("create-auction failed:", message);
    return res.status(500).json({ error: "IPFS upload failed", details: message });
  }
});

app.get("/metadata", async (req: Request, res: Response) => {
  try {
    const cid = String(req.query.cid || "");
    console.log("metadata request", { cid });
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

app.get("/auction-image", async (req: Request, res: Response) => {
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
