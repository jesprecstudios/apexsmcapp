import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uploadChartSnapshot } from "@/lib/storage/cloudinary";

const snapshotSchema = z.object({
  image: z.string().min(10, "Valid base64 image data is required"),
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  visibleRange: z.record(z.string(), z.unknown()).optional(),
  chartTimestamp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = snapshotSchema.parse(body);

    // Get current authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // In dev environment or unauthenticated test, fallback to guest ID
    const userId = user?.id || "guest-user";

    // Upload to Cloudinary
    const uploadResult = await uploadChartSnapshot(validatedData.image, {
      userId,
      symbol: validatedData.symbol,
      timeframe: validatedData.timeframe,
    });

    // If authenticated with real Supabase, record snapshot in DB
    let snapshotId = "simulated-snapshot-" + Date.now();
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbSnapshot, error: dbError } = await (supabase.from("snapshots") as any)
        .insert({
          user_id: user.id,
          storage_path: uploadResult.url,
          symbol: validatedData.symbol,
          timeframe: validatedData.timeframe,
          visible_range: validatedData.visibleRange as Record<string, unknown> | null,
          metadata: {
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            storageProvider: "cloudinary",
          },
        })
        .select("id")
        .single();

      if (!dbError && dbSnapshot) {
        snapshotId = (dbSnapshot as { id: string }).id;
      }
    }

    return NextResponse.json({
      success: true,
      snapshotId,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      symbol: validatedData.symbol,
      timeframe: validatedData.timeframe,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to process snapshot upload" },
      { status: 500 }
    );
  }
}
