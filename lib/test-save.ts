import { encrypt } from "./encryption";
import { prisma } from "./prisma";

async function testSave() {
  const secret = process.env.APP_SECRET || "fallback_test_secret_for_debug";
  const apiKey = "gsk_dummy_key_123456";

  const userId = "dummy_user_id"; // Since we use foreign keys, this might fail, so let's create a user first
  
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
         email: "test@example.com",
         name: "test",
      }
    });
  }

  try {
    const encryptedValue = encrypt(apiKey, secret);
    console.log("Encrypted successfully:", encryptedValue.substring(0, 20) + "...");

    await prisma.userApiKey.upsert({
      where: {
        userId_service: {
          userId: user.id,
          service: "groq",
        },
      },
      update: { encryptedValue },
      create: {
        userId: user.id,
        service: "groq",
        encryptedValue,
      },
    });

    console.log("Saved successfully to DB!");
  } catch (error) {
    console.error("DEBUG ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSave();
