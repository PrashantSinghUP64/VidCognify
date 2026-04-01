import { test, expect } from '@playwright/test';

test.describe('Security Questions Flow E2E', () => {
  
  test.describe('Registration Flow', () => {
    test('should allow setting up security questions after signing up', async ({ page }) => {
      // Mock the security questions GET endpoint
      await page.route('**/api/security-questions', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            questions: [
              { id: 'q1', question: 'What is your nick name?' },
              { id: 'q2', question: 'What was your first travelling city name?' },
              { id: 'q3', question: 'What was the name of your first school?' },
            ]
          })
        });
      });

      // Mock the registration endpoint
      await page.route('**/api/auth/sign-up/email', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user', email: 'test@example.com' },
            session: { id: 'test-session' }
          })
        });
      });

      // Mock the setup endpoint
      await page.route('**/api/security-questions/setup', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/register');
      
      // Step 1: Credentials
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[id="password"]', 'Valid1Password!');
      await page.fill('input[id="confirmPassword"]', 'Valid1Password!');
      await page.click('button:has-text("Continue")');

      // Step 2: Security Questions
      // Wait for it to switch steps
      await expect(page.locator('h1:has-text("Security Questions")')).toBeVisible();

      // Ensure select boxes have populated from dynamic mock
      const selects = page.locator('select');
      await expect(selects).toHaveCount(3);
      
      // Select questions and fill answers
      await selects.nth(0).selectOption('q1');
      await page.locator('input[placeholder="Your answer"]').nth(0).fill('nick');

      await selects.nth(1).selectOption('q2');
      await page.locator('input[placeholder="Your answer"]').nth(1).fill('paris');

      await selects.nth(2).selectOption('q3');
      await page.locator('input[placeholder="Your answer"]').nth(2).fill('school');

      // Intercept navigation
      let setupWizardNavigated = false;
      page.on('framenavigated', (frame) => {
        if (frame.url().includes('/setup')) setupWizardNavigated = true;
      });

      await page.click('button:has-text("Create account")');
    });
  });

  test.describe('Forgot Password Flow', () => {
    test('should recover password using security questions', async ({ page }) => {
      // Mock Step 1: user questions
      await page.route('**/api/security-questions/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            questions: [
              { id: 'q1', question: 'What is your nick name?' },
              { id: 'q2', question: 'What was your first travelling city name?' },
              { id: 'q3', question: 'What was the name of your first school?' }
            ]
          })
        });
      });

      // Mock Step 2: verify answers
      await page.route('**/api/security-questions/verify', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            resetToken: 'mock-reset-token'
          })
        });
      });

      // Mock Step 3: reset password
      await page.route('**/api/security-questions/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        });
      });

      await page.goto('/forgot-password');

      // Step 1: Email Request
      await expect(page.locator('h1:has-text("Reset Password")')).toBeVisible();
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button:has-text("Continue")');

      // Step 2: Answer Questions
      await expect(page.locator('p:has-text("Answer any 2 of your 3 security questions")')).toBeVisible();
      
      const selects = page.locator('select');
      await expect(selects).toHaveCount(2);

      await selects.nth(0).selectOption('q1');
      await page.locator('input[placeholder="Your answer"]').nth(0).fill('nick');

      await selects.nth(1).selectOption('q2');
      await page.locator('input[placeholder="Your answer"]').nth(1).fill('paris');

      await page.click('button:has-text("Verify Answers")');

      // Step 3: Set New Password
      await expect(page.locator('h1:has-text("Set New Password")')).toBeVisible();
      await page.fill('input[id="newPassword"]', 'New1Password!');
      await page.fill('input[id="confirmPassword"]', 'New1Password!');
      
      await page.click('button:has-text("Reset Password")');

      // Step 4: Success
      await expect(page.locator('h1:has-text("Password Reset!")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('a:has-text("Go to Sign In")')).toBeVisible();
    });
  });

});
