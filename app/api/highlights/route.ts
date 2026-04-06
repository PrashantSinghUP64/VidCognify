import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";
import { extractVideoId } from "@/lib/youtube";

// ── GET  /api/highlights?videoUrl=<encoded> ─────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.success) return auth.response;
  const userId = auth.userId;

  const rawVideoUrl = req.nextUrl.searchParams.get("videoUrl") ?? "";
  if (!rawVideoUrl) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }

  const videoId = decodeVideoUrl(rawVideoUrl);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  try {
    const summaryRecord = await prisma.summary.findFirst({
      where: { videoId, userId },
      select: { id: true },
    });

    if (!summaryRecord) {
      return NextResponse.json({ highlights: [] });
    }

    const highlights = await prisma.highlight.findMany({
      where: { summaryId: summaryRecord.id, userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ highlights });
  } catch (error) {
    console.error("Highlights GET error:", error);
    return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
  }
}

// ── POST /api/highlights ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.success) return auth.response;
  const userId = auth.userId;

  try {
    const { videoUrl, text, note, color } = await req.json();

    if (!videoUrl || !text) {
      return NextResponse.json({ error: "videoUrl and text are required" }, { status: 400 });
    }

    const validColors = ["yellow", "green", "blue", "pink"];
    const safeColor = validColors.includes(color) ? color : "yellow";

    const videoId = decodeVideoUrl(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const summaryRecord = await prisma.summary.findFirst({
      where: { videoId, userId },
      select: { id: true },
    });

    if (!summaryRecord) {
      return NextResponse.json(
        { error: "Summary not found. Please generate a summary first." },
        { status: 404 }
      );
    }

    const highlight = await prisma.highlight.create({
      data: {
        userId,
        summaryId: summaryRecord.id,
        text: text.slice(0, 1000), // safety cap
        note: note ? String(note).slice(0, 500) : null,
        color: safeColor,
      },
    });

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    console.error("Highlights POST error:", error);
    return NextResponse.json({ error: "Failed to save highlight" }, { status: 500 });
  }
}

// ── DELETE /api/highlights ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.success) return auth.response;
  const userId = auth.userId;

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Ensure the highlight belongs to this user
    const existing = await prisma.highlight.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
    }

    await prisma.highlight.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Highlights DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete highlight" }, { status: 500 });
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────
function decodeVideoUrl(videoUrl: string): string | null {
  let urlToExtract = videoUrl;

  if (
    !videoUrl.includes("youtube.com") &&
    !videoUrl.includes("youtu.be") &&
    videoUrl.length > 11
  ) {
    try {
      urlToExtract = Buffer.from(
        videoUrl.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf-8");
    } catch {
      // fall through with original
    }
  }

  try {
    return extractVideoId(urlToExtract);
  } catch {
    return null;
  }
}
