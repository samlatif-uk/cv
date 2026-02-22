import pkg from "@prisma/client";
import { readFile } from "node:fs/promises";

const { PrismaClient, ConnectionStatus } = pkg;

const prisma = new PrismaClient();

const defaultEducation = [
  {
    degree: "MSc Computer Games & Entertainment",
    institution: "Goldsmiths, University of London",
    period: "2011 – 2012",
    grade: "Merit · 67%",
    note: "Final project deferred to maintain quality of concurrent client commitments.",
  },
  {
    degree: "BSc Computer Games Technologies",
    institution: "University of East London",
    period: "2007 – 2010",
    grade: "1st Class Honours",
    note: "Modules: Games Programming, 3D Graphics, Virtual Environments, Network Gaming, Advanced Animation, Project Management.",
  },
  {
    degree: "BSc Cognitive Science (1st year attended)",
    institution: "University of Leeds",
    period: "2005 – 2006",
    grade: "Year 1 Completed",
    note: "Foundations in HCI, UX design, human behaviour and logic — directly relevant to frontend and UX work.",
  },
];

async function seedCvProfile(userId, profile) {
  if (Array.isArray(profile.overviewStats) && profile.overviewStats.length) {
    await prisma.cvOverviewStat.createMany({
      data: profile.overviewStats.map((stat, index) => ({
        userId,
        value: stat.value,
        label: stat.label,
        sortOrder: index,
      })),
    });
  }

  await prisma.cvTechRow.createMany({
    data: profile.techRows.map((row, index) => ({
      userId,
      category: row.cat,
      items: row.items,
      years: row.yrs,
      sortOrder: index,
    })),
  });

  await prisma.cvSkill.createMany({
    data: profile.skills.map((skill, index) => ({
      userId,
      name: skill.n,
      category: skill.c,
      sortOrder: index,
    })),
  });

  if (Array.isArray(profile.education) && profile.education.length) {
    await prisma.cvEducation.createMany({
      data: profile.education.map((entry, index) => ({
        userId,
        degree: entry.degree,
        institution: entry.institution,
        period: entry.period,
        grade: entry.grade,
        note: entry.note,
        sortOrder: index,
      })),
    });
  }

  for (const [jobIndex, job] of profile.jobs.entries()) {
    await prisma.cvJob.create({
      data: {
        userId,
        company: job.co,
        date: job.date,
        title: job.title,
        description: job.desc,
        sortOrder: jobIndex,
        cvJobBullets: {
          create: job.bullets.map((bullet, index) => ({
            content: bullet,
            sortOrder: index,
          })),
        },
        cvJobStackItems: {
          create: job.stack.map((label, index) => ({
            label,
            sortOrder: index,
          })),
        },
      },
    });
  }
}

async function main() {
  const sharedCvData = JSON.parse(
    await readFile(
      new URL("../../shared/cv-data.json", import.meta.url),
      "utf-8",
    ),
  );

  await prisma.cvJobStackItem.deleteMany();
  await prisma.cvJobBullet.deleteMany();
  await prisma.cvJob.deleteMany();
  await prisma.cvSkill.deleteMany();
  await prisma.cvTechRow.deleteMany();
  await prisma.cvOverviewStat.deleteMany();
  await prisma.cvEducation.deleteMany();
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
      bio: "15+ years delivering high-performance, scalable web applications.",
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

  const aisha = await prisma.user.create({
    data: {
      email: "aisha.rahman@example.com",
      username: "aisharahman",
      name: "Aisha Rahman",
      headline: "Engineering Manager · Payments",
      location: "Birmingham, UK",
      bio: "Leads distributed teams building resilient payment infrastructure and developer platforms.",
    },
  });

  const luca = await prisma.user.create({
    data: {
      email: "luca.moretti@example.com",
      username: "lucamoretti",
      name: "Luca Moretti",
      headline: "Staff Product Designer",
      location: "Milan, Italy",
      bio: "Design systems specialist focused on enterprise UX, accessibility, and measurable product outcomes.",
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: "priya.nair@example.com",
      username: "priyanair",
      name: "Priya Nair",
      headline: "Data Platform Architect",
      location: "Leeds, UK",
      bio: "Designs cloud-native data pipelines and observability foundations for analytics and ML teams.",
    },
  });

  await seedCvProfile(sam.id, {
    overviewStats: [
      { value: "15+", label: "Years Experience" },
      { value: "25+", label: "Client Engagements" },
      { value: "5", label: "Finance Institutions" },
      { value: "MSc", label: "1st Class BSc" },
    ],
    techRows: sharedCvData.TECH_ROWS,
    skills: sharedCvData.SKILLS,
    jobs: sharedCvData.JOBS,
    education: sharedCvData.EDUCATION ?? defaultEducation,
  });

  await seedCvProfile(emma.id, {
    overviewStats: [
      { value: "10+", label: "Years Product" },
      { value: "40+", label: "Experiments Shipped" },
      { value: "6", label: "SaaS Products" },
      { value: "MSc", label: "Product Strategy" },
    ],
    techRows: [
      {
        cat: "Product",
        items: "Roadmapping, Experimentation, Analytics",
        yrs: "10+",
      },
      { cat: "Delivery", items: "Agile, Discovery Workshops, OKRs", yrs: "9+" },
    ],
    skills: [
      { n: "Figma", c: "ui" },
      { n: "Storybook", c: "ui" },
      { n: "React", c: "core" },
      { n: "Next.js", c: "core" },
      { n: "React Query", c: "state" },
      { n: "Git", c: "tooling" },
    ],
    jobs: [
      {
        co: "ScalePath SaaS",
        date: "2021 – Present",
        title: "Product Lead",
        desc: "Owns activation and retention initiatives across a multi-product B2B suite.",
        bullets: [
          "Scaled experimentation cadence from monthly to weekly.",
          "Aligned engineering and GTM priorities through measurable product goals.",
        ],
        stack: ["React", "Next.js", "Figma", "Storybook"],
      },
    ],
    education: [
      {
        degree: "MSc Product Strategy",
        institution: "University of Bristol",
        period: "2013 – 2014",
        grade: "Distinction",
        note: "Focused on experimentation frameworks, product analytics, and growth strategy.",
      },
    ],
  });

  await seedCvProfile(daniel.id, {
    overviewStats: [
      { value: "7+", label: "Years Frontend" },
      { value: "20+", label: "UI Deliveries" },
      { value: "4", label: "Design Systems" },
      { value: "BSc", label: "Computer Science" },
    ],
    techRows: [
      { cat: "Frontend", items: "React, TypeScript, Next.js", yrs: "7+" },
      { cat: "Testing", items: "Jest, RTL, Cypress", yrs: "6+" },
    ],
    skills: [
      { n: "React", c: "core" },
      { n: "TypeScript", c: "core" },
      { n: "Next.js", c: "core" },
      { n: "Jest", c: "testing" },
      { n: "React Testing Library", c: "testing" },
      { n: "Cypress", c: "testing" },
      { n: "Redux", c: "state" },
      { n: "Git", c: "tooling" },
    ],
    jobs: [
      {
        co: "Northbridge Fintech",
        date: "2022 – Present",
        title: "Frontend Engineer",
        desc: "Delivers workflow-heavy UX for onboarding and compliance journeys.",
        bullets: [
          "Created shared form architecture that reduced implementation time.",
          "Improved accessibility conformance across key transaction screens.",
        ],
        stack: ["React", "TypeScript", "Redux", "Cypress"],
      },
    ],
    education: [
      {
        degree: "BSc Computer Science",
        institution: "University of Manchester",
        period: "2011 – 2014",
        grade: "First Class Honours",
        note: "Specialised in frontend architecture and human-computer interaction.",
      },
    ],
  });

  await seedCvProfile(aisha.id, {
    overviewStats: [
      { value: "11+", label: "Years Platform" },
      { value: "8+", label: "Years Leadership" },
      { value: "3", label: "Payments Platforms" },
      { value: "BEng", label: "Software Engineering" },
    ],
    techRows: [
      {
        cat: "Platform",
        items: "Node.js, TypeScript, Kafka, PostgreSQL",
        yrs: "11+",
      },
      {
        cat: "Leadership",
        items: "Hiring, Mentoring, Incident Management",
        yrs: "8+",
      },
    ],
    skills: [
      { n: "Node.js", c: "core" },
      { n: "TypeScript", c: "core" },
      { n: "RESTful APIs", c: "core" },
      { n: "GraphQL", c: "core" },
      { n: "Jest", c: "testing" },
      { n: "Git", c: "tooling" },
    ],
    jobs: [
      {
        co: "OrbitPay",
        date: "2020 – Present",
        title: "Engineering Manager",
        desc: "Leads payments platform teams across reliability and compliance workstreams.",
        bullets: [
          "Cut critical incident volume through reliability programme execution.",
          "Introduced platform standards adopted by four product squads.",
        ],
        stack: ["Node.js", "TypeScript", "RESTful APIs", "Jest"],
      },
      {
        co: "Mercury Transfers",
        date: "2016 – 2020",
        title: "Senior Software Engineer",
        desc: "Built money-movement services and partner integration tooling.",
        bullets: [
          "Delivered migration from monolith services to modular APIs.",
          "Mentored engineers moving from support to product development.",
        ],
        stack: ["Node.js", "GraphQL", "Git"],
      },
    ],
    education: [
      {
        degree: "BEng Software Engineering",
        institution: "University of Birmingham",
        period: "2009 – 2013",
        grade: "First Class Honours",
        note: "Built distributed systems and reliability-focused backend services.",
      },
    ],
  });

  await seedCvProfile(luca.id, {
    overviewStats: [
      { value: "9+", label: "Years Design Systems" },
      { value: "30+", label: "UX Audits" },
      { value: "6", label: "Enterprise Products" },
      { value: "MA", label: "Interaction Design" },
    ],
    techRows: [
      {
        cat: "Design Systems",
        items: "Figma, Storybook, Design Tokens",
        yrs: "9+",
      },
      {
        cat: "Prototyping",
        items: "React, Framer, Accessibility Testing",
        yrs: "7+",
      },
    ],
    skills: [
      { n: "Figma", c: "ui" },
      { n: "Storybook", c: "ui" },
      { n: "React", c: "core" },
      { n: "TypeScript", c: "core" },
      { n: "Jest", c: "testing" },
      { n: "Git", c: "tooling" },
    ],
    jobs: [
      {
        co: "Atlas Enterprise",
        date: "2021 – Present",
        title: "Staff Product Designer",
        desc: "Owns multi-product design system and cross-team UX quality metrics.",
        bullets: [
          "Raised adoption of shared components across six product teams.",
          "Partnered with engineering to ship accessible patterns by default.",
        ],
        stack: ["Figma", "Storybook", "React", "TypeScript"],
      },
    ],
    education: [
      {
        degree: "MA Interaction Design",
        institution: "Politecnico di Milano",
        period: "2012 – 2014",
        grade: "Distinction",
        note: "Focused on enterprise UX patterns, accessibility, and design systems.",
      },
    ],
  });

  await seedCvProfile(priya.id, {
    overviewStats: [
      { value: "10+", label: "Years Data Engineering" },
      { value: "50+", label: "Pipelines Delivered" },
      { value: "4", label: "Cloud Migrations" },
      { value: "MSc", label: "Data Science" },
    ],
    techRows: [
      {
        cat: "Data Engineering",
        items: "Python, SQL, Airflow, Spark",
        yrs: "10+",
      },
      { cat: "Cloud", items: "AWS, Terraform, Kubernetes", yrs: "8+" },
    ],
    skills: [
      { n: "Node.js", c: "core" },
      { n: "GraphQL", c: "core" },
      { n: "RESTful APIs", c: "core" },
      { n: "TypeScript", c: "core" },
      { n: "Git", c: "tooling" },
    ],
    jobs: [
      {
        co: "Northstar Data",
        date: "2019 – Present",
        title: "Data Platform Architect",
        desc: "Architects ingestion and serving pipelines for analytics and ML workloads.",
        bullets: [
          "Introduced data contracts reducing downstream schema breakages.",
          "Built observability standards for pipeline SLAs and lineage.",
        ],
        stack: ["TypeScript", "Node.js", "RESTful APIs", "Git"],
      },
    ],
    education: [
      {
        degree: "MSc Data Science",
        institution: "University of Leeds",
        period: "2012 – 2013",
        grade: "Distinction",
        note: "Specialised in data pipelines, distributed processing, and analytics engineering.",
      },
    ],
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
      {
        authorId: aisha.id,
        content:
          "We just completed a major reliability sprint across our payment retries and alerting workflows.",
      },
      {
        authorId: luca.id,
        content:
          "Sharing a practical approach for scaling design systems without slowing down product delivery.",
      },
      {
        authorId: priya.id,
        content:
          "Exploring event-driven data contracts to reduce breakages between platform and product teams.",
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
      {
        requesterId: sam.id,
        receiverId: aisha.id,
        status: ConnectionStatus.ACCEPTED,
      },
      {
        requesterId: luca.id,
        receiverId: sam.id,
        status: ConnectionStatus.ACCEPTED,
      },
      {
        requesterId: priya.id,
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

  const samRecommendations = sharedCvData.TESTIMONIALS.map((testimonial) => ({
    recipientId: sam.id,
    recommenderName: testimonial.by,
    recommenderRole: testimonial.role,
    relationshipLabel: testimonial.relationship,
    recommendationAt: new Date(testimonial.date),
    content: testimonial.quote,
    isPublic: testimonial.visibility !== "private",
  }));

  await prisma.recommendation.createMany({
    data: [
      ...samRecommendations,
      {
        recipientId: aisha.id,
        recommenderName: "Tom Reeves",
        recommenderRole: "VP Engineering",
        relationshipLabel: "Managed Aisha directly",
        recommendationAt: new Date("2024-09-12"),
        content:
          "Aisha consistently balances delivery pace with engineering quality. She led multiple cross-team migrations with clear communication and measurable outcomes.",
        isPublic: true,
      },
      {
        recipientId: luca.id,
        recommenderName: "Elena Ricci",
        recommenderRole: "Director of Product",
        relationshipLabel: "Worked with Luca on the same team",
        recommendationAt: new Date("2023-11-03"),
        content:
          "Luca raises the quality bar across design and product. His system thinking helped us ship faster while improving UX consistency.",
        isPublic: true,
      },
      {
        recipientId: priya.id,
        recommenderName: "Karan Mehta",
        recommenderRole: "Head of Data",
        relationshipLabel: "Priya was senior to Karan",
        recommendationAt: new Date("2024-02-18"),
        content:
          "Priya has a rare blend of platform depth and practical delivery focus. She modernised our data stack without disrupting downstream teams.",
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
