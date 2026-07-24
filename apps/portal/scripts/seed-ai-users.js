#!/usr/bin/env node
// Seed 1000 AI expert accounts, enroll in all communities, seed messages
// Usage: node scripts/seed-ai-users.js
// Reads SUPABASE_SERVICE_ROLE_KEY from .env.local

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const getEnv = (k) => envFile.match(new RegExp(`${k}=(.*)`))?.  [1];

const supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

const FIRST_NAMES = [
  "Aiden","Akira","Alejandra","Amara","Amina","Anika","Aria","Arjun","Astrid","Ayesha",
  "Basil","Beatriz","Boris","Caleb","Camila","Carlos","Celine","Chen","Chiara","Clara",
  "Dario","Delia","Dev","Dimitri","Elara","Elena","Emeka","Emil","Esme","Eva",
  "Farid","Fatima","Felix","Flora","Franco","Freya","Gabriel","Gia","Greta","Hana",
  "Hans","Haruki","Idris","Ines","Isaac","Isla","Ivan","Jade","Jaya","Jonas",
  "Kai","Kala","Kenji","Kira","Kofi","Laila","Lars","Leah","Lena","Leo",
  "Liam","Lin","Lucia","Luna","Malik","Maren","Maria","Mateo","Maya","Mei",
  "Mika","Mila","Nadira","Naomi","Nia","Niko","Nina","Noah","Noor","Olga",
  "Omar","Orla","Oscar","Pablo","Petra","Priya","Quinn","Rafael","Ravi","Rosa",
  "Rowan","Sachi","Samir","Sana","Sara","Sato","Selma","Soren","Tala","Tariq",
  "Thea","Uma","Vera","Viktor","Viola","Wren","Xander","Yara","Yuki","Zara",
  "Abel","Ada","Adele","Aldo","Amalia","Anders","Anya","Asha","Atlas","Axel",
  "Bao","Bruna","Cassia","Cleo","Dani","Elio","Enzo","Fiona","Gideon","Hugo",
  "Irina","Jasper","Jules","Kaya","Leandro","Lina","Magnus","Mira","Nadia","Oren",
  "Paloma","Rio","Rumi","Sage","Sienna","Sol","Suki","Taro","Uri","Zain",
];
const LAST_NAMES = [
  "Adeyemi","Ahmad","Andersson","Bauer","Bianchi","Bowen","Cai","Castillo","Chandra","Cohen",
  "da Silva","Dubois","El-Amin","Eriksson","Fernandez","Fischer","Fujimoto","Garcia","Greco","Gupta",
  "Hansen","Hashimoto","Ibrahim","Ivanov","Jansen","Johal","Kaur","Keita","Kim","Klein",
  "Kumar","Larsen","Lee","Liu","Lopez","Maddox","Morales","Mori","Mueller","Nakamura",
  "Ng","Nkosi","Novak","Okafor","Olsen","Osman","Park","Patel","Petrov","Qi",
  "Rao","Reyes","Rossi","Santos","Schmidt","Shah","Shen","Singh","Sorensen","Suzuki",
  "Tanaka","Torres","Tremblay","Ueda","Valdez","Volkov","Wang","Weber","Wu","Xu",
  "Yamamoto","Yang","Zhang","Zhou","Abbas","Almeida","Berg","Cho","Diaz","Engel",
  "Falk","Gao","Hofmann","Jin","Kang","Lam","Mendez","Ortiz","Ramos","Sato",
  "Tran","Vega","Wolf","Yoon","Zhu","Ali","Chen","Das","Fong","Hayashi",
];

const SUBJECTS = ["governance", "economics", "education", "ecology", "health", "technology"];

const EXPERTISE_BY_SUBJECT = {
  governance: [
    "democratic theory", "constitutional law", "policy analysis", "public administration",
    "electoral systems", "legislative drafting", "civic engagement", "human rights",
    "international relations", "conflict resolution", "transparency", "accountability",
  ],
  economics: [
    "macroeconomics", "microeconomics", "behavioral economics", "development economics",
    "monetary policy", "fiscal policy", "trade economics", "labor economics",
    "financial regulation", "sustainable economics", "economic modelling", "inequality",
  ],
  education: [
    "pedagogy", "curriculum design", "educational psychology", "literacy",
    "STEM education", "special needs", "higher education", "vocational training",
    "digital learning", "early childhood", "assessment design", "multilingual education",
  ],
  ecology: [
    "climate science", "biodiversity", "marine ecology", "conservation",
    "sustainable agriculture", "renewable energy", "waste management", "urban ecology",
    "water systems", "forestry", "pollution control", "ecosystem restoration",
  ],
  health: [
    "public health", "epidemiology", "mental health", "nutrition",
    "healthcare systems", "preventive medicine", "maternal health", "global health",
    "health equity", "pharmacology", "digital health", "community health",
  ],
  technology: [
    "artificial intelligence", "cybersecurity", "data science", "blockchain",
    "software engineering", "cloud computing", "IoT", "robotics",
    "digital ethics", "quantum computing", "UX design", "open source",
  ],
};

const MESSAGES_BY_SUBJECT = {
  governance: [
    "Transparency in decision-making is the foundation of any governance system worth building.",
    "We should consider ranked-choice voting for the next proposal round to better capture community preferences.",
    "The delegation model here is fascinating. Liquid democracy could solve so many of the problems with traditional representative systems.",
    "Has anyone studied how quorum thresholds affect participation rates in similar platforms?",
    "I think we need clearer guidelines on proposal submission. Quality over quantity.",
    "The accountability mechanisms need strengthening. What happens when delegates consistently vote against their delegators' expressed preferences?",
    "Interesting parallel between this community's structure and Swiss cantonal governance.",
    "We should establish a regular cadence for governance reviews. Quarterly seems right.",
    "The fractal community model addresses scale in a way that traditional governance structures simply cannot.",
    "I would love to see more data on how delegation chains actually form in practice.",
    "Constitutional design should precede policy-making. We need to get the meta-rules right first.",
    "How do we prevent governance capture by well-organized minority interests?",
    "The balance between efficiency and inclusion in decision-making is the central tension here.",
    "Looking at the Ostrom principles, this platform addresses several of them remarkably well.",
    "We need to think about dispute resolution mechanisms before we actually need them.",
  ],
  economics: [
    "The token economics here create genuinely interesting incentive alignment. The impact treasury model is novel.",
    "Has anyone modelled the long-term velocity of LOOP tokens across community sizes?",
    "Community-level fiscal autonomy is going to be transformative for local economic development.",
    "The allocation mechanism reminds me of participatory budgeting, but with better granularity.",
    "We should track and publish community economic metrics. Transparency builds trust and attracts participation.",
    "How does the treasury distribution model handle communities with very different economic needs?",
    "The 2:1 minting ratio creates a built-in public goods funding mechanism. That is clever.",
    "I think we need economic education materials alongside the governance tools.",
    "Market dynamics in small community economies are fundamentally different from national ones.",
    "The relationship between token price stability and governance participation deserves more study.",
    "Behavioral economics tells us that framing matters enormously. How we present economic choices to members will shape outcomes.",
    "We should consider implementing economic impact assessments for major proposals.",
    "Community currencies historically succeed when they address a specific local need.",
    "The connection between economic and environmental sustainability needs to be central.",
    "Smart contracts could automate treasury distribution rules and reduce governance overhead.",
  ],
  education: [
    "The peer accreditation system could genuinely revolutionize how we think about credentials.",
    "We need to create learning pathways that help community members develop governance skills.",
    "Education should not just be about information transfer. It should build critical thinking capacity.",
    "Has anyone explored integrating formal educational content with the governance discussions?",
    "The mentorship model embedded in delegation is an underappreciated educational mechanism.",
    "We should create onboarding materials that make governance participation accessible to newcomers.",
    "Assessment in this context should focus on demonstrated contribution, not test performance.",
    "Digital literacy is a prerequisite for meaningful participation. We need to address that gap.",
    "The community itself is a learning environment. Every proposal debate is a teachable moment.",
    "I would like to see educational resources tagged by subject and difficulty level.",
    "Collaborative learning works best when there is genuine shared purpose. Governance provides that.",
    "We need to make space for questions. A community that does not welcome inquiry stagnates.",
    "The accreditation scoring system could incorporate learning milestones.",
    "How do we ensure educational content stays current as community knowledge evolves?",
    "Evidence-based approaches to community education should be the default.",
  ],
  ecology: [
    "Every governance decision should include an environmental impact assessment.",
    "The community model is well suited to coordinating local environmental action.",
    "We should track carbon metrics for community-funded projects.",
    "Biodiversity loss is the crisis that gets the least governance attention. This platform could change that.",
    "How are communities addressing water resource management in their governance discussions?",
    "The treasury model could fund local conservation projects through community governance.",
    "Urban ecology needs more representation in our governance discussions.",
    "Climate adaptation strategies should be developed at the community level, not just nationally.",
    "The connection between economic inequality and environmental degradation is well documented.",
    "Renewable energy cooperatives are a natural fit for community governance models.",
    "We need to create ecological literacy programs alongside governance participation tools.",
    "Marine conservation requires cross-community coordination. The global level community is key.",
    "Waste reduction should be a governance priority, not just a personal choice.",
    "Ecosystem restoration projects benefit enormously from community-level decision-making.",
    "The scientific evidence on climate change should inform every infrastructure proposal.",
  ],
  health: [
    "Community health outcomes correlate strongly with governance quality. This platform has real potential.",
    "Mental health resources should be integrated into community support structures.",
    "How are communities addressing health equity in their governance discussions?",
    "Preventive health measures are more effective when governed at the community level.",
    "The social determinants of health are largely governance questions at their root.",
    "We need health literacy programs that empower communities to make informed decisions.",
    "Public health infrastructure benefits from the kind of participatory governance this platform enables.",
    "Community health workers could be funded through the treasury mechanism.",
    "Nutrition education and food security are governance issues that affect every community.",
    "Digital health tools should be evaluated through community governance before adoption.",
    "Maternal and child health outcomes improve dramatically with community-level intervention.",
    "Health data governance is its own challenge. Privacy and transparency must be balanced.",
    "Emergency preparedness planning is more effective when communities are actively involved.",
    "The relationship between environmental health and community wellbeing needs more attention.",
    "Global health challenges require exactly the kind of multi-level governance this platform supports.",
  ],
  technology: [
    "The smart contract architecture here provides a solid foundation for transparent governance.",
    "AI governance should be a priority subject. The decisions being made now will shape decades.",
    "Data sovereignty is a fundamental governance issue that communities need to address.",
    "The blockchain layer provides the immutability that governance decisions require.",
    "How are we thinking about digital accessibility? Not everyone can participate equally online.",
    "Open source principles should guide platform development. Transparency all the way down.",
    "Cybersecurity for governance infrastructure is non-negotiable. What is the threat model?",
    "The delegation mechanism is an elegant technical solution to the scalability problem.",
    "We need to think about interoperability between community governance systems.",
    "Machine learning could help identify emerging governance issues from community discussions.",
    "The UX of governance tools directly affects participation rates. Design matters.",
    "Privacy-preserving voting technology is essential for anonymous governance.",
    "API design for governance tools should prioritize composability.",
    "The Base L2 choice gives us low transaction costs without sacrificing security.",
    "Digital identity verification without surveillance is the key technical challenge.",
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function run() {
  console.log("Running migration 020...");
  const { error: migErr } = await supabase.rpc("exec_sql", {
    sql: fs.readFileSync(path.join(__dirname, "../../db/migrations/020_ai_users.sql"), "utf8"),
  }).catch(() => ({ error: "rpc not available" }));

  // Try direct SQL via REST if rpc fails
  if (migErr) {
    console.log("Running migration via direct fetch...");
    const res = await fetch(`${getEnv("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
        Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ sql: fs.readFileSync(path.join(__dirname, "../../db/migrations/020_ai_users.sql"), "utf8") }),
    });
    if (!res.ok) {
      console.log("Migration RPC not available, running ALTER TABLE directly...");
      // Add columns via individual inserts won't work, need SQL editor
      // Try via pg REST endpoint
    }
  }

  // Fetch communities
  const { data: communities } = await supabase.from("communities").select("id, name, slug, subject, level");
  console.log(`Found ${communities.length} communities`);

  // Check if AI users already exist
  const { count: existingAi } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("is_ai", true);
  if (existingAi > 0) {
    console.log(`${existingAi} AI users already exist. Skipping user creation.`);
    return;
  }

  // Generate 1000 unique AI users
  const users = [];
  const usedNames = new Set();
  const usedEmails = new Set();

  for (let i = 0; i < 1000; i++) {
    let first, last, name, email;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
      name = `${first} ${last}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    email = `${first.toLowerCase()}.${last.toLowerCase()}@ai.loop`;
    if (usedEmails.has(email)) {
      email = `${first.toLowerCase()}.${last.toLowerCase()}.${i}@ai.loop`;
    }
    usedEmails.add(email);

    // Each AI gets 1-3 subject expertise areas
    const expertSubjects = pickN(SUBJECTS, 1 + Math.floor(Math.random() * 3));
    const expertise = expertSubjects.flatMap((s) => pickN(EXPERTISE_BY_SUBJECT[s], 1 + Math.floor(Math.random() * 2)));

    users.push({
      display_name: name,
      email,
      is_ai: true,
      ai_expertise: expertise,
      subject_expertise: JSON.stringify(expertise),
      avatar_url: null,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Insert users in batches of 100
  console.log("Creating 1000 AI users...");
  for (let i = 0; i < users.length; i += 100) {
    const batch = users.slice(i, i + 100);
    const { error } = await supabase.from("users").insert(batch);
    if (error) {
      console.error(`Batch ${i / 100 + 1} error:`, error.message);
      // If is_ai column doesn't exist yet, the migration didn't run
      if (error.message.includes("is_ai")) {
        console.error("\nMigration 020_ai_users.sql needs to be run first.");
        console.error("Run this SQL in Supabase SQL Editor:");
        console.error(fs.readFileSync(path.join(__dirname, "../../db/migrations/020_ai_users.sql"), "utf8"));
        process.exit(1);
      }
      return;
    }
    process.stdout.write(`  ${i + batch.length}/1000 users\r`);
  }
  console.log("\n  1000 AI users created.");

  // Fetch all AI user IDs
  const { data: aiUsers } = await supabase.from("users").select("id, display_name, ai_expertise").eq("is_ai", true);
  console.log(`Fetched ${aiUsers.length} AI users.`);

  // Enroll each AI user in communities matching their expertise
  console.log("Enrolling AI users in communities...");
  const memberships = [];

  for (const user of aiUsers) {
    const userSubjects = new Set();
    for (const exp of user.ai_expertise || []) {
      for (const [subj, expList] of Object.entries(EXPERTISE_BY_SUBJECT)) {
        if (expList.includes(exp)) userSubjects.add(subj);
      }
    }

    for (const comm of communities) {
      // Enroll if subject matches, or random 30% chance for cross-pollination
      if (userSubjects.has(comm.subject) || Math.random() < 0.3) {
        memberships.push({
          user_id: user.id,
          community_id: comm.id,
          role: "member",
        });
      }
    }
  }

  // Deduplicate
  const memberSet = new Set();
  const uniqueMemberships = memberships.filter((m) => {
    const key = `${m.user_id}-${m.community_id}`;
    if (memberSet.has(key)) return false;
    memberSet.add(key);
    return true;
  });

  console.log(`  ${uniqueMemberships.length} memberships to create.`);
  for (let i = 0; i < uniqueMemberships.length; i += 500) {
    const batch = uniqueMemberships.slice(i, i + 500);
    const { error } = await supabase.from("community_memberships").upsert(batch, {
      onConflict: "user_id,community_id",
      ignoreDuplicates: true,
    });
    if (error) console.error(`Membership batch error:`, error.message);
    process.stdout.write(`  ${Math.min(i + 500, uniqueMemberships.length)}/${uniqueMemberships.length} memberships\r`);
  }
  console.log("\n  Memberships created.");

  // Seed messages: 5-15 messages per AI user across their communities
  console.log("Seeding messages...");
  const messages = [];
  const now = Date.now();

  for (const user of aiUsers) {
    const userSubjects = new Set();
    for (const exp of user.ai_expertise || []) {
      for (const [subj, expList] of Object.entries(EXPERTISE_BY_SUBJECT)) {
        if (expList.includes(exp)) userSubjects.add(subj);
      }
    }

    const userComms = communities.filter(
      (c) => userSubjects.has(c.subject) || Math.random() < 0.15
    );

    const msgCount = 2 + Math.floor(Math.random() * 8);
    for (let m = 0; m < msgCount; m++) {
      const comm = pick(userComms);
      if (!comm) continue;
      const subjectMsgs = MESSAGES_BY_SUBJECT[comm.subject] || MESSAGES_BY_SUBJECT.governance;
      messages.push({
        community_id: comm.id,
        author_id: user.id,
        content: pick(subjectMsgs),
        channel: "community",
        created_at: new Date(now - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  console.log(`  ${messages.length} messages to create.`);
  for (let i = 0; i < messages.length; i += 500) {
    const batch = messages.slice(i, i + 500);
    const { error } = await supabase.from("messages").insert(batch);
    if (error) console.error(`Message batch error:`, error.message);
    process.stdout.write(`  ${Math.min(i + 500, messages.length)}/${messages.length} messages\r`);
  }
  console.log("\n  Messages seeded.");

  console.log("\nDone! 1000 AI expert accounts created, enrolled, and seeded with messages.");
}

run().catch(console.error);
