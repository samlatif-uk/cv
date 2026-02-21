import pkg from "@prisma/client";

const { PrismaClient, ConnectionStatus } = pkg;

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const sam = await prisma.user.create({
    data: {
      email: "hello@samlatif.uk",
      username: "samlatif",
      name: "Sam Latif",
      headline: "Senior Fullstack Consultant",
      location: "West London, UK",
      bio: "15+ years building high-performance products in fintech and enterprise.",
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: "emma.chen@example.com",
      username: "emmachen",
      name: "Emma Chen",
      headline: "Product Lead, B2B SaaS",
      location: "London, UK",
      bio: "Product operator focused on growth and retention loops.",
    },
  });

  const daniel = await prisma.user.create({
    data: {
      email: "daniel.okafor@example.com",
      username: "danielokafor",
      name: "Daniel Okafor",
      headline: "Frontend Engineer",
      location: "Manchester, UK",
      bio: "React and design-systems engineer who loves shipping polished UX.",
    },
  });

  await prisma.post.createMany({
    data: [
      {
        authorId: sam.id,
        content:
          "Shipping the v1 of a professional network MVP this week. Looking for early adopters and feedback.",
      },
      {
        authorId: emma.id,
        content:
          "Hiring: senior frontend contractors with fintech experience. Remote-first, UK timezone.",
      },
      {
        authorId: daniel.id,
        content:
          "Open-sourcing our accessibility checklist for enterprise dashboards.",
      },
    ],
  });

  await prisma.connection.createMany({
    data: [
      {
        requesterId: sam.id,
        receiverId: emma.id,
        status: ConnectionStatus.ACCEPTED,
      },
      {
        requesterId: daniel.id,
        receiverId: sam.id,
        status: ConnectionStatus.PENDING,
      },
    ],
  });

  const conversation = await prisma.conversation.create({ data: {} });

  await prisma.conversationMember.createMany({
    data: [
      { conversationId: conversation.id, userId: sam.id },
      { conversationId: conversation.id, userId: emma.id },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: emma.id,
        content: "Hey Sam — interested in a short discovery call next week?",
      },
      {
        conversationId: conversation.id,
        senderId: sam.id,
        content:
          "Absolutely. Send over a couple of time slots and I’ll confirm.",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
