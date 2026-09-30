import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteChartSnapshot } from "@/lib/storage/cloudinary";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysis, error } = await (supabase.from("analyses") as any)
      .select("*, snapshots(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First fetch the analysis to get the snapshot_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysis, error: fetchError } = await (supabase.from("analyses") as any)
      .select("id, snapshot_id, snapshots(id, metadata)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Delete the analysis from DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from("analyses") as any)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    // If snapshot has Cloudinary metadata publicId, clean it up
    const typedAnalysis = analysis as {
      id: string;
      snapshot_id: string | null;
      snapshots?: {
        id: string;
        metadata?: { publicId?: string };
      } | null;
    };
    const snapshotMeta = typedAnalysis.snapshots?.metadata;
    if (snapshotMeta?.publicId) {
      await deleteChartSnapshot(snapshotMeta.publicId);
    }

    // If snapshot exists, delete snapshot record as well
    if (analysis.snapshot_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("snapshots") as any)
        .delete()
        .eq("id", analysis.snapshot_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true, message: "Analysis deleted successfully" });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
