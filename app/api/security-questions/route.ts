import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/security-questions
 * Returns the list of available security questions
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

    // Auto-seed default questions if we don't have all 5
    if (questions.length < 5) {
      const defaultQuestions = [
        "What is your nick name?",
        "What was your first travelling city name?",
        "What was the name of your first school?",
        "What is your favorite movie?",
        "What city were you born in?",
      ]

      for (const q of defaultQuestions) {
        await prisma.securityQuestion.upsert({
          where: { question: q },
          update: {},
          create: { question: q },
        })
      }

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
