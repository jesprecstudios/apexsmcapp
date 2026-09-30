import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary server-side
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

const isConfigured =
  cloudName &&
  apiKey &&
  apiSecret &&
  !cloudName.includes("placeholder") &&
  !apiSecret.includes("placeholder");

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export interface SnapshotUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Uploads a base64 or buffer chart snapshot image to Cloudinary.
 * Stores under `apexsmc/snapshots/{userId}/{symbol}_{timestamp}`.
 */
export async function uploadChartSnapshot(
  imageBase64: string,
  metadata: {
    userId: string;
    symbol: string;
    timeframe: string;
  }
): Promise<SnapshotUploadResult> {
  const cleanSymbol = metadata.symbol.replace(/[^a-zA-Z0-9]/g, "");
  const timestamp = Date.now();
  const publicId = `apexsmc/snapshots/${metadata.userId}/${cleanSymbol}_${metadata.timeframe}_${timestamp}`;

  // If Cloudinary credentials are not configured (e.g. initial dev environment), simulate upload safely
  if (!isConfigured) {
    return {
      url: imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`,
      publicId: `dev-simulated-${publicId}`,
      format: "png",
      bytes: Buffer.byteLength(imageBase64, "utf8"),
      width: 1920,
      height: 1080,
    };
  }

  try {
    const uploadResponse: UploadApiResponse = await cloudinary.uploader.upload(
      imageBase64,
      {
        public_id: publicId,
        resource_type: "image",
        folder: `apexsmc/snapshots/${metadata.userId}`,
        tags: ["apexsmc", "chart-snapshot", cleanSymbol, metadata.timeframe],
        overwrite: false,
      }
    );

    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      format: uploadResponse.format,
      bytes: uploadResponse.bytes,
      width: uploadResponse.width,
      height: uploadResponse.height,
    };
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Cloudinary snapshot upload failed: ${error.message}`);
  }
}

/**
 * Deletes a chart snapshot image from Cloudinary by its publicId.
 */
export async function deleteChartSnapshot(publicId: string): Promise<boolean> {
  if (!isConfigured || publicId.startsWith("dev-simulated-")) {
    return true;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return result.result === "ok";
  } catch (err) {
    console.warn(`Failed to destroy Cloudinary image ${publicId}:`, err);
    return false;
  }
}

