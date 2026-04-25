import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import multer from "multer";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL;
const pinataJwt = process.env.JWT_TOKEN || process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
const DEDICATED_GATEWAY = "https://jade-fancy-earwig-731.mypinata.cloud/ipfs";

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
  if (!uri || typeof uri !== "string") {
    throw new Error("Invalid CID/URI provided");
  }

  const value = uri.trim();

  if (!value) {
    throw new Error("CID is required.");
  }

  // Handle full HTTP URLs if they somehow get passed
  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      if (url.pathname.includes("/ipfs/")) {
        return url.pathname.split("/ipfs/")[1].split("/")[0];
      }
    } catch {
      // Not a valid URL, continue with CID parsing
    }
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

async function fetchFromGateway(cidOrUri: string, retries = 3) {
  let cid: string;
  try {
    cid = extractCid(cidOrUri);
  } catch (e) {
    throw new Error(`Invalid IPFS reference: ${cidOrUri}`);
  }

  const errors: any[] = [];
  const url = `${DEDICATED_GATEWAY.replace(/\/+$/, "")}/${cid}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`[IPFS] Fetching ${cid} from Dedicated Gateway (attempt ${attempt}/${retries})...`);
      console.log(`[IPFS] URL: ${url}`);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          "Accept": "application/json, image/*, */*"
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error body");
        console.warn(`[IPFS] Gateway returned ${response.status} for ${cid}: ${errorText}`);
        errors.push({ attempt, status: response.status, message: errorText });
        
        // If it's a 404, maybe don't retry as much or at all, but following retry logic
        continue;
      }

      console.log(`[IPFS] Successfully fetched ${cid} from dedicated gateway`);
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      const message = error.name === 'AbortError' ? 'Timeout after 15s' : error.message;
      console.warn(`[IPFS] Dedicated Gateway failed for ${cid}: ${message}`);
      errors.push({ attempt, error: message });
    }
    
    if (attempt < retries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[IPFS] Dedicated Gateway failed for ${cid}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to fetch CID ${cid} from dedicated gateway after ${retries} attempts. Errors: ${JSON.stringify(errors)}`);
}

app.get("/debug/ipfs/:cid", async (req: Request, res: Response) => {
  const cid = req.params.cid;
  const results: any[] = [];
  
  const url = `${DEDICATED_GATEWAY.replace(/\/+$/, "")}/${cid}`;
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const duration = Date.now() - start;
    
    results.push({
      gateway: DEDICATED_GATEWAY,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      duration: `${duration}ms`
    });
  } catch (err: any) {
    results.push({ gateway: DEDICATED_GATEWAY, error: err.message });
  }
  
  res.json({ cid, results });
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

    console.log("[CreateAuction] Uploading image...");
    const imageCID = await uploadImageToIPFS(req.file);
    
    const metadata = {
      name: name.trim(),
      description: description.trim(),
      condition: (condition || "").trim(),
      image: imageCID,
    };
    
    console.log("[CreateAuction] Metadata to upload:", JSON.stringify(metadata, null, 2));
    const metadataCID = await uploadMetadataToIPFS(metadata);
    
    console.log("[CreateAuction] Verifying integrity of metadata CID:", metadataCID);
    try {
      // Immediate verification to ensure Pinata hasn't returned a CID that it can't serve
      const verifyRes = await fetchFromGateway(metadataCID, 2);
      const verifyJson = await verifyRes.json();
      console.log("[CreateAuction] Integrity check passed:", verifyJson);
    } catch (vErr) {
      console.warn("[CreateAuction] Integrity check failed/delayed, but continuing:", vErr instanceof Error ? vErr.message : String(vErr));
    }

    return res.json({ metadataCID, imageCID });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPFS upload failed";
    console.error("create-auction failed:", message);
    return res.status(500).json({ error: "IPFS upload failed", details: message });
  }
});

app.get("/metadata", async (req: Request, res: Response) => {
  const cid = String(req.query.cid || "");
  try {
    if (!cid || cid === "undefined" || cid === "null") {
      return res.status(400).json({ error: "Valid CID is required" });
    }

    console.log("[Metadata] Request for:", cid);
    const response = await fetchFromGateway(cid);
    
    // Some gateways might return text/plain for JSON
    const metadata = await response.json();
    
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error("Metadata response was not a valid JSON object");
    }

    return res.json(metadata);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata fetch failed";
    console.error(`[Metadata] Failed for ${cid}:`, message);
    
    return res.status(502).json({ 
      error: "IPFS Gateway Error", 
      details: message,
      cid: cid 
    });
  }
});

app.get("/auction-image", async (req: Request, res: Response) => {
  const cid = String(req.query.cid || "");
  try {
    if (!cid || cid === "undefined" || cid === "null") {
       return res.status(400).json({ error: "Valid CID is required" });
    }

    const response = await fetchFromGateway(cid);
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image fetch failed";
    console.error(`[Image] Failed for ${cid}:`, message);
    return res.status(502).json({ error: "Image fetch failed", details: message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
