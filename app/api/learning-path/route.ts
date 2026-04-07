import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";
import { extractVideoId } from "@/lib/youtube";

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
      select: { category: true, keywords: true, title: true }
    });

    console.log("Summary found:", !!summaryRecord);
    console.log("Category:", summaryRecord?.category);
    console.log("Keywords:", summaryRecord?.keywords);

    // continue with fallback
    let searchQuery = "educational tutorial";
    if (summaryRecord?.category) searchQuery = summaryRecord.category;
    if (summaryRecord?.keywords) {
      searchQuery += " " + summaryRecord.keywords.split(",").slice(0, 3).join(" ");
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn("YOUTUBE_API_KEY not found. Returning empty learning path.");
      return NextResponse.json({ videos: [] });
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&maxResults=5&type=video&key=${apiKey}`;
    
    console.log("Search query:", searchQuery);
    console.log("YouTube API Key exists:", !!process.env.YOUTUBE_API_KEY);

    const ytRes = await fetch(url);
    
    console.log("YouTube status:", ytRes.status);
    if (!ytRes.ok) {
      return NextResponse.json({ videos: [] });
    }

    const ytData = await ytRes.json();
    console.log("YouTube data:", JSON.stringify(ytData));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videos = ytData.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
    }));

    return NextResponse.json({ videos });

  } catch (error) {
    console.error("Learning Path GET error:", error);
    return NextResponse.json({ videos: [] });
  }
}

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
      // fall through
    }
  }

  try {
    return extractVideoId(urlToExtract);
  } catch {
    return null;
  }
}
