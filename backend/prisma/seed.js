import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --------------------
  // 1. Create admin user
  // --------------------
  const admin = await prisma.user.create({
    data: {
      email: "admin@rgukt.ac.in",
      password: "hashedpassword", // replace later with bcrypt hash
      role: "ADMIN",
      isVerified: true,
    },
  });

  console.log("✅ Admin created:", admin.email);

  // --------------------
  // 2. Create event
  // --------------------
  const event = await prisma.event.create({
    data: {
      title: "RGUKT Auditorium Event",
      description: "Annual cultural program",
      language: "English",
      category: "Cultural",
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Event created:", event.title);

  // --------------------
  // 3. Create physical seats
  // --------------------
  const rows = ["A", "B", "C"];
  const seatsPerRow = 10;

  const seatData = [];

  for (const row of rows) {
    for (let number = 1; number <= seatsPerRow; number++) {
      seatData.push({ row, number });
    }
  }

  await prisma.seat.createMany({
    data: seatData,
    skipDuplicates: true,
  });

  const seats = await prisma.seat.findMany();
  console.log(`✅ ${seats.length} physical seats created`);

  // --------------------
  // 4. Create event_seats
  // --------------------
  const eventSeatData = seats.map((seat) => ({
    eventId: event.id,
    seatId: seat.id,
    status: "AVAILABLE",
  }));

  await prisma.eventSeat.createMany({
    data: eventSeatData,
    skipDuplicates: true,
  });

  console.log(`✅ ${eventSeatData.length} event seats initialized`);

  console.log("🌱 Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
