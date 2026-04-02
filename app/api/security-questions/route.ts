import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_QUESTIONS = [
  "What was the name of your first school?",
  "What city were you born in?",
  "What was your childhood nickname?",
]

/**
 * GET /api/security-questions
 * Returns the list of available security questions.
 * Auto-seeds the 3 default questions if the table is empty.
 */
export async function GET() {
  try {
    let questions = await prisma.securityQuestion.findMany({
      select: {
        id: true,
        question: true,
      },
      orderBy: {
        question: "asc",
      },
    })

    // Seed default questions if none exist
    if (questions.length === 0) {
      await prisma.securityQuestion.createMany({
        data: DEFAULT_QUESTIONS.map((q) => ({ question: q })),
        skipDuplicates: true,
      })

      questions = await prisma.securityQuestion.findMany({
        select: {
          id: true,
          question: true,
        },
        orderBy: {
          question: "asc",
        },
      })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Error fetching security questions:", error)
    return NextResponse.json(
      { error: "Failed to fetch security questions" },
      { status: 500 }
    )
  }
}
