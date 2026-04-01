import { NextRequest } from 'next/server';
import { GET as getQuestions } from '@/app/api/security-questions/route';
import { POST as setupQuestions } from '@/app/api/security-questions/setup/route';
import { POST as userQuestions } from '@/app/api/security-questions/user/route';
import { POST as verifyQuestions } from '@/app/api/security-questions/verify/route';
import { POST as resetPassword } from '@/app/api/security-questions/reset-password/route';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import * as authServer from '@/lib/auth-server'; // For mocking validatePassword

jest.mock('@/lib/prisma', () => ({
  prisma: {
    securityQuestion: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userSecurityQuestion: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    user: {
      findFirst: jest.fn(),
    },
    verification: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      updateMany: jest.fn(),
    },
    session: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/apiAuth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    success: true,
    userId: 'test-user-id',
  }),
}));

// We strictly replace authenticateRequest using 'require' for test-toggling 
// since it is imported within the routes. Let's mock the actual function inside the library.
const { authenticateRequest } = require('@/lib/apiAuth');

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/auth-server', () => ({
  validatePassword: jest.fn().mockReturnValue({ valid: true }),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Security Questions API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateRequest.mockResolvedValue({ success: true, userId: 'test-user-id' });
  });

  const createJsonRequest = (url: string, body: any) => {
    return new NextRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('GET /api/security-questions', () => {
    it('should return available security questions', async () => {
      (mockedPrisma.securityQuestion.findMany as jest.Mock).mockResolvedValue([
        { id: '1', question: 'Q1' },
      ]);
      const req = new NextRequest('http://localhost:3000/api/security-questions');
      const res = await getQuestions();
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.questions).toHaveLength(1);
    });
  });

  describe('POST /api/security-questions/setup', () => {
    it('should require authentication', async () => {
      const { NextResponse } = require('next/server');
      authenticateRequest.mockResolvedValue({ 
        success: false, 
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
      });
      const req = createJsonRequest('http://localhost/api/security-questions/setup', {});
      const res = await setupQuestions(req);
      expect(res.status).toBe(401);
    });

    it('should set up 3 security questions successfully', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/setup', {
        answers: [
          { questionId: 'q1', answer: 'a' },
          { questionId: 'q2', answer: 'b' },
          { questionId: 'q3', answer: 'c' }
        ]
      });

      (mockedPrisma.securityQuestion.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'mocked-id-1' })
        .mockResolvedValueOnce({ id: 'mocked-id-2' })
        .mockResolvedValueOnce({ id: 'mocked-id-3' });
      (mockedPrisma.userSecurityQuestion.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.userSecurityQuestion.create as jest.Mock).mockResolvedValue({});

      const res = await setupQuestions(req);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
    });

    it('should fail if user already has questions set up', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/setup', {
        answers: [
          { questionId: 'q1', answer: 'a' },
          { questionId: 'q2', answer: 'b' },
          { questionId: 'q3', answer: 'c' }
        ]
      });

      (mockedPrisma.securityQuestion.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'mocked-id-1' })
        .mockResolvedValueOnce({ id: 'mocked-id-2' })
        .mockResolvedValueOnce({ id: 'mocked-id-3' });
      (mockedPrisma.userSecurityQuestion.findMany as jest.Mock).mockResolvedValue([{ id: 'existing' }]);

      const res = await setupQuestions(req);
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Security questions already set up. Use the update endpoint to modify.');
    });
  });

  describe('POST /api/security-questions/user', () => {
    it('should return security questions for valid email', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/user', { email: 'test@example.com' });
      
      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      (mockedPrisma.userSecurityQuestion.findMany as jest.Mock).mockResolvedValue([
        { question: { id: 'q1', question: 'Question 1?' } },
        { question: { id: 'q2', question: 'Question 2?' } },
        { question: { id: 'q3', question: 'Question 3?' } }
      ]);

      const res = await userQuestions(req);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.questions).toHaveLength(3);
      expect(data.questions[0].id).toBe('q1');
    });

    it('should prevent user enumeration with generic 404 message', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/user', { email: 'nonexistent@example.com' });
      
      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await userQuestions(req);
      const data = await res.json();
      
      expect(res.status).toBe(404);
      expect(data.error).toBe('If this email exists, security questions will be displayed');
    });
  });

  describe('POST /api/security-questions/verify', () => {
    it('should verify correct answers and return reset token', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/verify', {
        email: 'test@example.com',
        answers: [
          { questionId: 'q1', answer: 'answer1' },
          { questionId: 'q2', answer: 'answer2' }
        ]
      });

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      (mockedPrisma.userSecurityQuestion.findMany as jest.Mock).mockResolvedValue([
        { questionId: 'q1', answerHash: 'hash1' },
        { questionId: 'q2', answerHash: 'hash2' },
        { questionId: 'q3', answerHash: 'hash3' }
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await verifyQuestions(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resetToken).toBeDefined();
    });

    it('should fail if less than 2 answers are correct', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/verify', {
        email: 'test@example.com',
        answers: [
          { questionId: 'q1', answer: 'answer1' },
          { questionId: 'q2', answer: 'wrong' }
        ]
      });

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user1', email: 'test@example.com' });
      (mockedPrisma.userSecurityQuestion.findMany as jest.Mock).mockResolvedValue([
        { questionId: 'q1', answerHash: 'hash1' },
        { questionId: 'q2', answerHash: 'hash2' },
        { questionId: 'q3', answerHash: 'hash3' }
      ]);
      
      // Simulate first comparison succeeding, second failing
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const res = await verifyQuestions(req);
      
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/security-questions/reset-password', () => {
    it('should successfully reset password', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/reset-password', {
        email: 'test@example.com',
        resetToken: 'valid-token',
        newPassword: 'Valid1Password!'
      });

      (mockedPrisma.verification.findFirst as jest.Mock).mockResolvedValue({ id: 'token-id' });
      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user1' });

      const res = await resetPassword(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockedPrisma.account.updateMany).toHaveBeenCalled();
      expect(mockedPrisma.verification.delete).toHaveBeenCalled();
      expect(mockedPrisma.session.deleteMany).toHaveBeenCalled();
    });

    it('should reject weak passwords', async () => {
      // Setup mock to fail password generic logic
      const authServerLib = require('@/lib/auth-server');
      authServerLib.validatePassword.mockReturnValueOnce({ valid: false, error: 'Weak password' });

      const req = createJsonRequest('http://localhost/api/security-questions/reset-password', {
        email: 'test@example.com',
        resetToken: 'valid-token',
        newPassword: 'weak'
      });

      const res = await resetPassword(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Weak password');
    });

    it('should reject invalid or expired tokens', async () => {
      const req = createJsonRequest('http://localhost/api/security-questions/reset-password', {
        email: 'test@example.com',
        resetToken: 'invalid-token',
        newPassword: 'Valid1Password!'
      });

      (mockedPrisma.verification.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await resetPassword(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Invalid or expired reset token');
    });
  });
});
