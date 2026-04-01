import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateRequest } from "@/lib/apiAuth"
import bcrypt from "bcrypt"

interface SecurityQuestionAnswer {
  questionId: string
  answer: string
}

/**
 * POST /api/security-questions/setup
 * Set up security questions for a user (requires exactly 3 questions)
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { userId } = authResult

  try {
    const body = await request.json()
    const { answers } = body as { answers: SecurityQuestionAnswer[] }

    // Validate we have exactly 3 questions
    if (!answers || answers.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 security questions are required" },
        { status: 400 }
      )
    }

    // Since the frontend might send raw question texts instead of IDs,
    // we must resolve or create these questions in the database dynamically.
    const resolvedQuestionIds: string[] = []
    for (const answer of answers) {
      const questionText = answer.questionId // This might be the literal string
      let sq = await prisma.securityQuestion.findUnique({
        where: { question: questionText }
      })
      if (!sq) {
        // If it's technically a real CUID ID, this findUnique would fail but we can safely assume
        // it's the raw text from the hardcoded frontend dropdown.
        sq = await prisma.securityQuestion.create({
          data: { question: questionText }
        })
      }
      resolvedQuestionIds.push(sq.id)
      // Re-map the answer to use the real database ID for the relation
      answer.questionId = sq.id
    }

    // Validate all questions are unique
    const uniqueIds = new Set(resolvedQuestionIds)
    if (uniqueIds.size !== 3) {
      return NextResponse.json(
        { error: "All 3 security questions must be different" },
        { status: 400 }
      )
    }

    // Check if user already has security questions
    const existingUserQuestions = await prisma.userSecurityQuestion.findMany({
      where: { userId },
    })

    if (existingUserQuestions.length > 0) {
      return NextResponse.json(
        { error: "Security questions already set up. Use the update endpoint to modify." },
        { status: 400 }
      )
    }

    // Hash answers and create records
    const hashedAnswers = await Promise.all(
      answers.map(async (answer, index) => ({
        userId,
        questionId: answer.questionId,
        answerHash: await bcrypt.hash(answer.answer.toLowerCase().trim(), 12),
        questionOrder: index + 1,
      }))
    )

    // Create all security question answers in a transaction
    await prisma.$transaction(
      hashedAnswers.map((data) =>
        prisma.userSecurityQuestion.create({ data })
      )
    )

    return NextResponse.json({
      success: true,
      message: "Security questions set up successfully",
    })
  } catch (error) {
    console.error("Error setting up security questions:", error)
    return NextResponse.json(
      { error: "Failed to set up security questions" },
      { status: 500 }
    )
  }
}
