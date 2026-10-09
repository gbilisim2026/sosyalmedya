import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();
const username = "demo_sosyal";
const password = "SosyalDemo2026!";

async function main() {
  const passwordHash = await hash(password);

  await prisma.user.upsert({
    where: { usernameKey: username.toLowerCase() },
    update: {
      username,
      passwordHash,
      displayName: "Demo Kullanıcı",
      bio: "Sosyalmedya örnek hesabı",
      isPrivate: false,
    },
    create: {
      username,
      usernameKey: username.toLowerCase(),
      passwordHash,
      displayName: "Demo Kullanıcı",
      bio: "Sosyalmedya örnek hesabı",
      isPrivate: false,
    },
  });

  console.log(`Demo account ready: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });