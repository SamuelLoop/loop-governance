import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("../node_modules/.pnpm/@supabase+supabase-js@2.110.7/node_modules/@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const COMMUNITY_ID = "5ab727a9-e213-4cb7-a7de-89dff3db0231"; // Global

const FIRST_NAMES = [
  "Aisha", "Bjorn", "Carmen", "Dmitri", "Elena", "Femi", "Greta", "Hiroshi",
  "Ingrid", "Jamal", "Keiko", "Leandro", "Mei", "Nikolai", "Oluwaseun",
  "Priya", "Quinn", "Rafael", "Sakura", "Tariq", "Uma", "Viktor", "Wren",
  "Xander", "Yuki", "Zara", "Aiden", "Bianca", "Callum", "Dara", "Ezra",
  "Fatima", "Gavin", "Hana", "Ivan", "Jaya", "Kai", "Lena", "Mateo",
  "Nia", "Oscar", "Paloma", "Ravi", "Senna", "Tomas", "Ursula", "Viggo",
  "Willow", "Xiomara", "Yusuf",
];

const LAST_NAMES = [
  "Okafor", "Lindgren", "Reyes", "Volkov", "Papadopoulos", "Adeyemi",
  "Muller", "Tanaka", "Johansson", "Williams", "Nakamura", "Costa",
  "Chen", "Petrov", "Adebayo", "Sharma", "O'Brien", "Morales",
  "Yamamoto", "Hassan", "Kapoor", "Novak", "Larsson", "Park",
  "Sato", "El-Amin", "Kelly", "Rossi", "MacLeod", "Osei",
  "Fischer", "Kim", "Andersen", "Bianchi", "Torres", "Nguyen",
  "Dubois", "Hernandez", "Kowalski", "Suzuki", "Ahmad", "Jensen",
  "Eriksson", "Patel", "Garcia", "Hoffmann", "Ivanova", "Cruz",
  "Bergman", "Ali",
];

const LOCATIONS = [
  { h3: "871f24a85ffffff", name: "London, UK" },
  { h3: "872a1076dffffff", name: "New York, USA" },
  { h3: "8730e1464ffffff", name: "Tokyo, Japan" },
  { h3: "871f94686ffffff", name: "Berlin, Germany" },
  { h3: "872834536ffffff", name: "San Francisco, USA" },
  { h3: "8739c44a2ffffff", name: "Mumbai, India" },
  { h3: "871fb4680ffffff", name: "Paris, France" },
  { h3: "8729a98adffffff", name: "Toronto, Canada" },
  { h3: "872830828ffffff", name: "Lagos, Nigeria" },
  { h3: "8739c0ca8ffffff", name: "Sydney, Australia" },
];

const EXPERTISE_POOL = [
  "governance", "economics", "ecology", "education", "health", "technology",
  "law", "agriculture", "energy", "housing", "transport", "water",
];

const ROLES = ["member", "member", "member", "member", "quorum"];

const LOGIN_PASSWORD = "LoopTest2026!";

const LOGIN_USERS = [
  { first: "Alice", last: "Tester", email: "alice@looptest.dev" },
  { first: "Bob", last: "Voter", email: "bob@looptest.dev" },
  { first: "Charlie", last: "Delegate", email: "charlie@looptest.dev" },
  { first: "Diana", last: "Quorum", email: "diana@looptest.dev" },
  { first: "Eve", last: "Admin", email: "eve@looptest.dev" },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function seed() {
  console.log("Seeding 100 test users...\n");

  const allUsers = [];

  // Generate 95 random users
  const used = new Set();
  for (let i = 0; i < 95; i++) {
    let first, last, email;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
      email = `${first.toLowerCase()}.${last.toLowerCase()}@looptest.dev`;
    } while (used.has(email));
    used.add(email);
    allUsers.push({ first, last, email, password: null });
  }

  // Add 5 login users
  for (const u of LOGIN_USERS) {
    allUsers.push({ ...u, password: LOGIN_PASSWORD });
  }

  let created = 0;
  let skipped = 0;

  for (const u of allUsers) {
    const displayName = `${u.first} ${u.last}`;

    // Create auth user
    const authPayload = {
      email: u.email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    };
    if (u.password) {
      authPayload.password = u.password;
    }

    const { data: authUser, error: authErr } =
      await admin.auth.admin.createUser(authPayload);

    if (authErr) {
      if (authErr.message?.includes("already been registered")) {
        // If it's a login user, update password
        if (u.password) {
          const { data: listData } = await admin.auth.admin.listUsers();
          const existing = listData?.users?.find((x) => x.email === u.email);
          if (existing) {
            await admin.auth.admin.updateUserById(existing.id, {
              password: u.password,
            });
            console.log(`  Updated password for ${u.email}`);
          }
        }
        skipped++;
        continue;
      }
      console.error(`  Failed auth for ${u.email}: ${authErr.message}`);
      skipped++;
      continue;
    }

    const authId = authUser.user.id;
    const loc = pick(LOCATIONS);
    const expertise = pickN(EXPERTISE_POOL, 1 + Math.floor(Math.random() * 3));
    const role = u.password
      ? u.last === "Admin"
        ? "admin"
        : u.last === "Quorum"
          ? "quorum"
          : "member"
      : pick(ROLES);

    // Insert users row
    const { data: dbUser, error: dbErr } = await admin
      .from("users")
      .insert({
        auth_id: authId,
        display_name: displayName,
        email: u.email,
        h3_index: loc.h3,
        location_name: loc.name,
        subject_expertise: expertise,
      })
      .select("id")
      .single();

    if (dbErr) {
      console.error(`  Failed DB for ${u.email}: ${dbErr.message}`);
      continue;
    }

    // Join Global community
    const { error: memErr } = await admin.from("community_memberships").insert({
      user_id: dbUser.id,
      community_id: COMMUNITY_ID,
      role,
    });

    if (memErr) {
      console.error(`  Failed membership for ${u.email}: ${memErr.message}`);
    }

    created++;
    if (created % 10 === 0) console.log(`  ${created} users created...`);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.\n`);

  if (created > 0 || skipped > 0) {
    console.log("=== LOGIN CREDENTIALS ===");
    console.log("Password for all 5: " + LOGIN_PASSWORD);
    console.log("");
    for (const u of LOGIN_USERS) {
      console.log(`  ${u.first} ${u.last}`);
      console.log(`    Email:    ${u.email}`);
      console.log(`    Role:     ${u.last === "Admin" ? "admin" : u.last === "Quorum" ? "quorum" : "member"}`);
      console.log("");
    }
    console.log("Use the 'Instant sign in (dev)' button on the login page.");
    console.log("Enter any email above, click the dev button, and you're in.");
  }
}

seed().catch(console.error);
