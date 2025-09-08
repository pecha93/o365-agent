import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const titles = [
    "Connect Outlook/Teams",
    "Sync Notion tasks",
    "Draft agent architecture",
    "Plan OAuth flows",
  ];
  for (const title of titles) {
    await prisma.todo.create({ data: { title } });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});


