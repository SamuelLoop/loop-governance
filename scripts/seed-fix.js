#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "../apps/console/.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const { createClient } = require(
  path.join(
    __dirname,
    "../node_modules/.pnpm/@supabase+supabase-js@2.110.7/node_modules/@supabase/supabase-js"
  )
);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const STATEMENTS = [
  "I will prioritise transparent decision-making and regular community updates.",
  "My focus is on building bridges between regional communities.",
  "I bring 5 years of governance experience and a track record of delivering.",
  "I believe in data-driven policy and measurable outcomes.",
  "My priority is inclusion: making governance accessible to all.",
  "I will champion environmental accountability in every decision.",
  "I stand for fiscal responsibility and strategic resource allocation.",
  "I will work to streamline processes while maintaining democratic rigour.",
];

async function fix() {
  const { data: users } = await sb.from("users").select("id");
  const userIds = users.map(u => u.id);
  const { data: elections } = await sb.from("elections").select("id, community_id, status, seats");
  const { data: communities } = await sb.from("communities").select("id, name, level, subject");

  let total = 0;

  // --- 1. Fix memberships: batch upsert without duplicates in the array ---
  console.log("1. Fixing memberships...");
  const econCommunities = communities.filter(c => c.subject === "economics");
  const nationalGov = communities.filter(c => c.subject === "governance" && c.level === "national");

  const memMap = new Map();

  // 40 users across economics
  const econUsers = pickN(userIds, 40);
  for (const uid of econUsers) {
    for (const c of econCommunities) {
      memMap.set(`${uid}-${c.id}`, { user_id: uid, community_id: c.id, role: "member" });
    }
  }

  // Members in national governance
  for (const c of nationalGov) {
    const members = pickN(userIds, randomInt(15, 40));
    for (const uid of members) {
      const key = `${uid}-${c.id}`;
      if (!memMap.has(key)) {
        memMap.set(key, { user_id: uid, community_id: c.id, role: "member" });
      }
    }
  }

  // Quorum members across all
  for (const c of communities) {
    const quorumMembers = pickN(userIds, randomInt(2, 5));
    for (const uid of quorumMembers) {
      memMap.set(`${uid}-${c.id}`, { user_id: uid, community_id: c.id, role: "quorum" });
    }
  }

  const newMemberships = [...memMap.values()];
  const { error: memErr } = await sb.from("community_memberships").upsert(newMemberships, { onConflict: "user_id,community_id" });
  if (memErr) console.log("  membership error:", memErr.message);
  else { console.log(`  Upserted ${newMemberships.length} memberships`); total += newMemberships.length; }

  // --- 2. Create candidates for each election ---
  console.log("\n2. Creating candidates...");
  const allCandidates = [];

  for (const election of elections) {
    const numCandidates = randomInt(election.seats + 1, election.seats + 5);
    const candidates = pickN(userIds, numCandidates);
    for (const uid of candidates) {
      allCandidates.push({
        election_id: election.id,
        user_id: uid,
        statement: pick(STATEMENTS),
        subject_expertise: pick(["Policy", "Finance", "Technology", "Community Building", "Legal", "Environment", "Education", null]),
        votes_received: 0,
        elected: false,
      });
    }
  }

  const { data: insertedCandidates, error: candErr } = await sb
    .from("candidates")
    .upsert(allCandidates, { onConflict: "election_id,user_id" })
    .select("id, election_id, user_id");
  if (candErr) console.log("  candidates error:", candErr.message);
  else { console.log(`  Created ${insertedCandidates.length} candidates`); total += insertedCandidates.length; }

  // --- 3. Create election votes referencing actual candidate IDs ---
  console.log("\n3. Creating election votes...");
  const electionVotes = [];
  const usedVotes = new Set();

  if (insertedCandidates) {
    // Group candidates by election
    const candByElection = {};
    for (const c of insertedCandidates) {
      if (!candByElection[c.election_id]) candByElection[c.election_id] = [];
      candByElection[c.election_id].push(c);
    }

    for (const election of elections) {
      const candidates = candByElection[election.id] || [];
      if (candidates.length === 0) continue;

      // Each election gets 10-20 voters
      const voters = pickN(userIds, randomInt(10, 20));
      for (const voterId of voters) {
        // Each voter votes for 1-3 candidates
        const votesFor = pickN(candidates, randomInt(1, Math.min(3, candidates.length)));
        for (const cand of votesFor) {
          if (cand.user_id === voterId) continue;
          const key = `${election.id}-${voterId}-${cand.id}`;
          if (usedVotes.has(key)) continue;
          usedVotes.add(key);

          electionVotes.push({
            election_id: election.id,
            voter_id: voterId,
            candidate_id: cand.id,
            weight: randomInt(1, 3),
          });
        }
      }
    }

    const { error: evErr } = await sb.from("election_votes").insert(electionVotes);
    if (evErr) console.log("  election_votes error:", evErr.message);
    else { console.log(`  Created ${electionVotes.length} election votes`); total += electionVotes.length; }
  }

  // --- 4. Create quorum terms for completed elections ---
  console.log("\n4. Creating quorum terms...");
  const quorumTerms = [];

  for (const election of elections.filter(e => e.status === "completed")) {
    const candidates = (insertedCandidates || []).filter(c => c.election_id === election.id);
    const winners = pickN(candidates, Math.min(election.seats, candidates.length));
    for (const winner of winners) {
      quorumTerms.push({
        community_id: election.community_id,
        user_id: winner.user_id,
        election_id: election.id,
        starts_at: new Date(Date.now() - randomInt(30, 180) * 86400000).toISOString(),
        expires_at: new Date(Date.now() + randomInt(30, 180) * 86400000).toISOString(),
        active: true,
      });
    }
  }

  if (quorumTerms.length > 0) {
    const { error: qtErr } = await sb.from("quorum_terms").insert(quorumTerms);
    if (qtErr) console.log("  quorum_terms error:", qtErr.message);
    else { console.log(`  Created ${quorumTerms.length} quorum terms`); total += quorumTerms.length; }
  }

  // --- Summary ---
  console.log(`\nFix complete. ~${total} records added/updated.`);

  const tables = ["users","communities","community_memberships","proposals","votes","elections","election_votes","delegations","accreditations","accreditation_scores","messages","campaigns","candidates","quorum_terms"];
  console.log("\nFinal table counts:");
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t}: ${count}`);
  }
}

fix().catch(err => { console.error("Fix failed:", err); process.exit(1); });
