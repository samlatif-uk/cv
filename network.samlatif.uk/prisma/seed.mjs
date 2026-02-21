import pkg from "@prisma/client";

const { PrismaClient, ConnectionStatus } = pkg;

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.recommendation.deleteMany();
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

  await prisma.recommendation.createMany({
    data: [
      {
        recipientId: sam.id,
        recommenderName: "Mark Hollands",
        recommenderRole: "Quantitative Researcher at Citadel",
        relationshipLabel: "Worked with Sam on the same team",
        recommendationAt: new Date("2017-12-01"),
        content:
          "I worked with Sam at Goldman Sachs on a number of projects. He was very knowledgeable, supportive, and happy to guide others. He was enthusiastic, hard working, and a pleasure to work with.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Diana Ionel",
        recommenderRole: "Corporate Controller at European Space Agency - ESA",
        relationshipLabel: "Sam was senior to Diana",
        recommendationAt: new Date("2015-07-21"),
        content:
          "Sam was ambitious, decisive, and got up to speed quickly under heavy time pressure. He was an open-minded mentor and a dependable expert who solved problems on time.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Christopher Stanley",
        recommenderRole: "Client partner",
        relationshipLabel: "Managed Sam directly",
        recommendationAt: new Date("2014-05-16"),
        content:
          "Sam was creative, talented, and highly collaborative. He brought strong frontend and Magento expertise, a positive attitude, and consistently sought the best possible solution.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Dan Murray",
        recommenderRole: "Co-Founder, Heights",
        relationshipLabel: "Sam's client",
        recommendationAt: new Date("2013-11-22"),
        content:
          "Sam consistently over-delivered with clear ownership of UI/UX and product challenges. He is among the most reliable and professional developers I have worked with.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Joel Freeman",
        recommenderRole: "Co-Founder & CEO, Heights",
        relationshipLabel: "Sam's client",
        recommendationAt: new Date("2013-11-21"),
        content:
          "Sam was innovative and intelligent, quickly understood requirements, and delivered features fast. He contributed strongly to both product outcomes and team culture.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Kyle Milnes",
        recommenderRole: "CTO / Principal Architect",
        relationshipLabel: "Managed Sam directly",
        recommendationAt: new Date("2013-08-01"),
        content:
          "Sam was personable, highly capable, and stepped in across frontend and backend when needed. He handled pressure well and helped the team deliver its vision.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Paul Clarke",
        recommenderRole: "Owner",
        relationshipLabel: "Worked with Sam on the same team",
        recommendationAt: new Date("2012-11-02"),
        content:
          "Sam was forward-thinking, multi-skilled, and consistently delivered under pressure. He brought energy, adaptability, and dependable execution to every project.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Michael O'Sullivan",
        recommenderRole: "Chief Executive Officer at Bywire.News",
        relationshipLabel: "Sam's client",
        recommendationAt: new Date("2012-05-19"),
        content:
          "Sam was one of the most committed developers I worked with. He combined integrity, strong client focus, and delivery discipline in deadline-heavy projects.",
        isPublic: false,
      },
      {
        recipientId: sam.id,
        recommenderName: "Penda Tomlinson",
        recommenderRole: "Mentoring the next generation of games designers",
        relationshipLabel: "Sam's teacher",
        recommendationAt: new Date("2012-05-14"),
        content:
          "Sam was a diligent and technically strong student, confident in programming and 3D work. His enthusiasm and willingness to learn new tools stood out.",
        isPublic: true,
      },
      {
        recipientId: sam.id,
        recommenderName: "Panos Armagos",
        recommenderRole: "Back End Developer",
        relationshipLabel: "Studied together",
        recommendationAt: new Date("2012-05-04"),
        content:
          "Sam was passionate, open-minded, and deadline oriented. During university projects he was consistently proactive and dependable in getting things done.",
        isPublic: true,
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
