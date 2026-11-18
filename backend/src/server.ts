import { env } from "./config/env";
import { app } from "./app";
import { prisma } from "./config/prisma";
import { startReminderScheduler } from "./modules/notifications/reminders";

async function main() {
  await prisma.$connect();
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API chạy tại http://localhost:${env.PORT}/api`);
    startReminderScheduler();
  });
}

main().catch((e) => {
  console.error("Không khởi động được server:", e);
  process.exit(1);
});
