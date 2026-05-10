declare module "cors" {
  import type { RequestHandler } from "express";

  interface CorsOptions {
    origin?: boolean | string | RegExp | Array<string | RegExp>;
  }

  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}

declare namespace Express {
  namespace Multer {
    interface File {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }
  }

  interface Request {
    file?: Multer.File;
  }
}

declare module "multer" {
  import type { RequestHandler } from "express";

  interface MulterInstance {
    single(fieldName: string): RequestHandler;
  }

  interface MulterOptions {
    storage?: unknown;
    limits?: {
      fileSize?: number;
    };
  }

  interface MulterFactory {
    (options?: MulterOptions): MulterInstance;
    memoryStorage(): unknown;
  }

  const multer: MulterFactory;
  export default multer;
}
