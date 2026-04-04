import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const userId = auth.userId;

    // Get all summaries for the user
    const summaries = await prisma.summary.findMany({
      where: { userId },
      select: {
        id: true,
        category: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      }
    });

    const totalSummaries = summaries.length;

    // Compute Category Distribution
    const categoryCounts: Record<string, number> = {};
    for (const summary of summaries) {
      const cat = summary.category || "Other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Compute Streak
    let currentStreak = 0;
    const dateSet = new Set(summaries.map(s => s.createdAt.toISOString().split('T')[0]));
    const dates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let today = new Date();
    // Allow checking up to yesterday for active streak
    let currentDayStr = today.toISOString().split('T')[0];
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let yesterdayStr = yesterday.toISOString().split('T')[0];

    // If active today or yesterday, streak is at least 1 (or 0 if no summaries)
    let pointer = new Date(dates[0] === currentDayStr || dates[0] === yesterdayStr ? dates[0] : currentDayStr);
    
    if (dates.length > 0 && (dates[0] === currentDayStr || dates[0] === yesterdayStr)) {
      currentStreak = 0;
      let checkDate = pointer;
      while (dateSet.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Weekly Data for past 7 days
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = summaries.filter(s => s.createdAt.toISOString().split('T')[0] === dateStr).length;
      weeklyData.push({
        day: d.toLocaleDateString("en-US", { weekday: 'short' }),
        count
      });
    }

    return NextResponse.json({
      totalSummaries,
      categoryCounts,
      currentStreak,
      weeklyData
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
