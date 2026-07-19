#!/usr/bin/env node

/**
 * Comprehensive test data seeder for Loop Governance Platform
 * Seeds ~1000 records across all tables to simulate a live platform.
 *
 * Run: node scripts/seed-test-data.js
 */

const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "../apps/console/.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const { createRequire } = require("module");
const req = createRequire(
  require.resolve(
    path.join(
      __dirname,
      "../node_modules/.pnpm/@supabase+supabase-js@2.110.7/node_modules/@supabase/supabase-js/package.json"
    )
  )
);
const { createClient } = req("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SAMUEL = "02c63176-10c3-4211-846f-1b363c5f3307";

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const PROPOSAL_TITLES = [
  "Fund community solar panel installation",
  "Establish weekly governance town halls",
  "Create mentorship programme for new members",
  "Allocate budget for regional meetups",
  "Develop open-source voting transparency tool",
  "Launch community newsletter",
  "Build public API for governance data",
  "Partner with local universities for research",
  "Create dispute resolution framework",
  "Fund translation services for multilingual access",
  "Establish emergency response protocol",
  "Develop member onboarding curriculum",
  "Create cross-community collaboration grants",
  "Fund accessibility audit of platform",
  "Launch pilot programme for youth governance",
  "Establish term limits for quorum seats",
  "Create transparency report template",
  "Fund data privacy impact assessment",
  "Develop community health metrics dashboard",
  "Establish code of conduct review process",
  "Create regional economic development fund",
  "Launch digital literacy training programme",
  "Fund environmental impact monitoring",
  "Develop conflict-of-interest disclosure policy",
  "Create peer review system for proposals",
  "Fund community garden initiative",
  "Establish rotating chairperson protocol",
  "Create open data standards for governance",
  "Fund childcare support for meeting attendance",
  "Develop mobile-first governance interface",
];

const ELECTION_TITLES = [
  "Q3 2026 Leadership Election",
  "Continental Representative Selection",
  "Emergency Quorum Replacement",
  "Annual Leadership Rotation",
  "Special Election: Expansion Seats",
  "Mid-term Quorum Refresh",
  "Regional Coordinator Election",
  "Community Steward Selection",
];

const CANDIDATE_STATEMENTS = [
  "I will prioritise transparent decision-making and regular community updates.",
  "My focus is on building bridges between regional communities and ensuring every voice is heard.",
  "I bring 5 years of governance experience and a track record of delivering on commitments.",
  "I believe in data-driven policy and measurable outcomes for every initiative we pursue.",
  "My priority is inclusion: making governance accessible regardless of timezone or language.",
  "I will champion environmental accountability in every decision we make.",
  "I stand for fiscal responsibility and strategic allocation of community resources.",
  "I will work to streamline our processes while maintaining democratic rigour.",
];

const CHAT_MESSAGES = [
  "Has anyone reviewed the latest proposal? I think the budget allocation needs discussion.",
  "Welcome to the new members who joined this week!",
  "Can we schedule a community call for next Thursday?",
  "I think we should consider the environmental impact before voting.",
  "Great discussion yesterday. I have summarised the key points in the shared doc.",
  "Who is volunteering for the outreach committee?",
  "The quarterly report is now available for review.",
  "I support this initiative. Count me in for the working group.",
  "We need to address the participation gap in our continental communities.",
  "Reminder: voting closes in 48 hours.",
  "Has the budget been approved for the new programme?",
  "I have concerns about the timeline. Can we extend the consultation period?",
  "Excellent work on the accessibility improvements.",
  "Can someone share the minutes from last week?",
  "I propose we create a subcommittee for this topic.",
  "The community survey results are in. Very encouraging participation.",
  "We should coordinate with the other regional communities on this.",
  "Thanks for the detailed analysis. This is really helpful.",
  "I would like to nominate myself for the open seat.",
  "Can we get an update on the infrastructure project?",
  "The new onboarding flow is much better. Good work team.",
  "I think we need more diverse perspectives on this issue.",
  "Has anyone tested the new delegation feature?",
  "The community fund balance is looking healthy this quarter.",
  "We should celebrate our first 100 members!",
  "I disagree with the proposed approach. Here is an alternative.",
  "Can we revisit the quorum threshold? It seems too high for our size.",
  "Great turnout at the virtual meetup yesterday.",
  "The translation team needs more volunteers for French and German.",
  "I have drafted a response to the partner organisation. Please review.",
];

const QUORUM_MESSAGES = [
  "We need to discuss the budget reallocation before the community vote.",
  "I recommend we approve the proposal with the amended timeline.",
  "Let us schedule a leadership sync for next week.",
  "The compliance review is complete. No issues found.",
  "We should brief the community on our decision rationale.",
  "I move to table this discussion until we have more data.",
  "The risk assessment for the new programme looks acceptable.",
  "We need consensus on the delegation policy changes.",
  "I suggest we bring in an external advisor for this decision.",
  "The community feedback has been overwhelmingly positive.",
  "We should fast-track the emergency response proposal.",
  "Let us review the candidate applications before the election opens.",
  "The financial audit is due next month. Who is coordinating?",
  "I think we need to reconsider our position on this.",
  "Agreed. Let us proceed with the revised plan.",
];

const CAMPAIGN_PITCHES = [
  "I believe governance should be transparent, accountable, and accessible to all. My experience in community organising gives me the tools to deliver on this vision.",
  "As a long-time member, I have seen our community grow. I want to ensure that growth is sustainable and inclusive.",
  "My background in policy analysis means I can help us make evidence-based decisions that benefit everyone.",
  "I am passionate about digital democracy and have contributed to open-source governance tools used by thousands.",
  "I bring a fresh perspective and a commitment to listening before acting. Every voice matters.",
  "With experience spanning multiple communities, I understand the challenges of coordination at scale.",
  "I will focus on practical improvements: better communication, clearer processes, and measurable outcomes.",
  "I am committed to environmental sustainability as a core principle of our governance framework.",
  "My legal background helps me navigate the regulatory landscape and protect our community interests.",
  "I believe in servant leadership: my role is to empower the community, not accumulate power.",
];

async function seed() {
  console.log("Loading existing data...");

  const { data: users } = await sb.from("users").select("id, display_name");
  const { data: communities } = await sb.from("communities").select("id, name, level, subject, parent_id");
  const userIds = users.map(u => u.id);
  const userMap = {};
  for (const u of users) userMap[u.id] = u.display_name;

  const govCommunities = communities.filter(c => c.subject === "governance");
  const econCommunities = communities.filter(c => c.subject === "economics");
  const allCommunityIds = communities.map(c => c.id);

  let totalInserted = 0;

  // ---------------------------------------------------------------
  // 1. Spread memberships across ALL communities (especially economics)
  // ---------------------------------------------------------------
  console.log("\n1. Spreading memberships...");
  const newMemberships = [];

  // Add 40 members to economics communities
  const econUsers = pickN(userIds, 40);
  for (const uid of econUsers) {
    for (const c of econCommunities) {
      newMemberships.push({ user_id: uid, community_id: c.id, role: "member" });
    }
  }

  // Add members to governance national communities
  const nationalGov = govCommunities.filter(c => c.level === "national");
  for (const c of nationalGov) {
    const members = pickN(userIds, randomInt(15, 40));
    for (const uid of members) {
      newMemberships.push({ user_id: uid, community_id: c.id, role: "member" });
    }
  }

  // Make some users quorum in various communities
  for (const c of communities) {
    const quorumMembers = pickN(userIds, randomInt(2, 5));
    for (const uid of quorumMembers) {
      newMemberships.push({ user_id: uid, community_id: c.id, role: "quorum" });
    }
  }

  // Batch upsert memberships
  const { error: memErr } = await sb.from("community_memberships").upsert(newMemberships, { onConflict: "user_id,community_id" });
  if (memErr) console.log("  membership error:", memErr.message);
  else { console.log(`  Added/updated ${newMemberships.length} memberships`); totalInserted += newMemberships.length; }

  // ---------------------------------------------------------------
  // 2. Proposals (30 across governance + economics)
  // ---------------------------------------------------------------
  console.log("\n2. Creating proposals...");
  const proposals = [];
  const statuses = ["open", "open", "open", "approved", "approved", "rejected"];

  for (let i = 0; i < 30; i++) {
    const comm = pick([...govCommunities, ...econCommunities]);
    const author = pick(userIds);
    const age = randomInt(1, 90);
    const status = pick(statuses);
    const opensAt = daysAgo(age);
    const closesAt = status === "open" ? daysFromNow(randomInt(1, 14)) : daysAgo(age - 7);

    proposals.push({
      community_id: comm.id,
      author_id: author,
      title: PROPOSAL_TITLES[i % PROPOSAL_TITLES.length],
      description: `This proposal addresses a key need in the ${comm.name} community. We believe this initiative will strengthen our governance capacity and improve outcomes for all members. The proposed budget reflects careful analysis of similar programmes in comparable communities.`,
      status,
      budget_request_cents: pick([0, 5000, 25000, 100000, 500000, 1000000, 5000000]),
      consequence: pick(["Low risk", "Medium risk, high reward", "Critical infrastructure", "Community wellbeing", "Environmental impact", null]),
      votes_for: randomInt(0, 30),
      votes_against: randomInt(0, 10),
      opens_at: opensAt,
      closes_at: closesAt,
    });
  }

  const { data: insertedProposals, error: propErr } = await sb.from("proposals").insert(proposals).select("id, community_id");
  if (propErr) console.log("  proposals error:", propErr.message);
  else { console.log(`  Created ${insertedProposals.length} proposals`); totalInserted += insertedProposals.length; }

  // ---------------------------------------------------------------
  // 3. Votes on proposals (200)
  // ---------------------------------------------------------------
  console.log("\n3. Creating proposal votes...");
  const allProposals = insertedProposals ?? [];
  const votes = [];
  const usedVotes = new Set();

  for (let i = 0; i < 200; i++) {
    const proposal = pick(allProposals);
    const voter = pick(userIds);
    const key = `${proposal.id}-${voter}`;
    if (usedVotes.has(key)) continue;
    usedVotes.add(key);

    votes.push({
      proposal_id: proposal.id,
      voter_id: voter,
      choice: pick(["for", "for", "for", "against"]),
      weight: randomInt(1, 5),
    });
  }

  const { error: voteErr } = await sb.from("votes").upsert(votes, { ignoreDuplicates: true });
  if (voteErr) console.log("  votes error:", voteErr.message);
  else { console.log(`  Created ${votes.length} votes`); totalInserted += votes.length; }

  // ---------------------------------------------------------------
  // 4. Elections (8 across communities)
  // ---------------------------------------------------------------
  console.log("\n4. Creating elections...");
  const elections = [];
  const electionStatuses = ["completed", "completed", "completed", "voting", "nominations"];

  for (let i = 0; i < 8; i++) {
    const comm = pick([...govCommunities, ...econCommunities]);
    const status = electionStatuses[i % electionStatuses.length];
    const age = status === "completed" ? randomInt(30, 180) : randomInt(0, 14);

    elections.push({
      community_id: comm.id,
      title: ELECTION_TITLES[i],
      seats: pick([3, 5, 7]),
      term_days: pick([90, 180, 365]),
      status,
      nominations_open: daysAgo(age + 21),
      nominations_close: daysAgo(age + 14),
      voting_open: daysAgo(age + 14),
      voting_close: status === "completed" ? daysAgo(age) : daysFromNow(randomInt(3, 14)),
    });
  }

  const { data: insertedElections, error: elErr } = await sb.from("elections").insert(elections).select("id, community_id, status");
  if (elErr) console.log("  elections error:", elErr.message);
  else { console.log(`  Created ${insertedElections.length} elections`); totalInserted += insertedElections.length; }

  // ---------------------------------------------------------------
  // 5. Election votes (100)
  // ---------------------------------------------------------------
  console.log("\n5. Creating election votes...");
  const electionVotes = [];
  const usedElVotes = new Set();

  if (insertedElections) {
    for (let i = 0; i < 100; i++) {
      const election = pick(insertedElections);
      const voter = pick(userIds);
      const candidate = pick(userIds.filter(u => u !== voter));
      const key = `${election.id}-${voter}`;
      if (usedElVotes.has(key)) continue;
      usedElVotes.add(key);

      electionVotes.push({
        election_id: election.id,
        voter_id: voter,
        candidate_id: candidate,
        weight: randomInt(1, 5),
      });
    }

    const { error: evErr } = await sb.from("election_votes").upsert(electionVotes, { ignoreDuplicates: true });
    if (evErr) console.log("  election_votes error:", evErr.message);
    else { console.log(`  Created ${electionVotes.length} election votes`); totalInserted += electionVotes.length; }
  }

  // ---------------------------------------------------------------
  // 6. More delegations (80 across governance + economics)
  // ---------------------------------------------------------------
  console.log("\n6. Creating delegations...");
  const delegations = [];
  const usedDelegations = new Set();

  // Get existing delegations to avoid conflicts
  const { data: existingDel } = await sb.from("delegations").select("delegator_id, community_id, subject_tag");
  for (const d of existingDel ?? []) {
    usedDelegations.add(`${d.delegator_id}-${d.community_id}-${d.subject_tag}`);
  }

  for (let i = 0; i < 80; i++) {
    const subject = pick(["governance", "governance", "governance", "economics"]);
    const comms = subject === "governance" ? govCommunities : econCommunities;
    const comm = pick(comms);
    const delegator = pick(userIds);
    const delegate = pick(userIds.filter(u => u !== delegator));
    const key = `${delegator}-${comm.id}-${subject}`;
    if (usedDelegations.has(key)) continue;
    usedDelegations.add(key);

    delegations.push({
      delegator_id: delegator,
      delegate_id: delegate,
      community_id: comm.id,
      subject_tag: subject,
      active: true,
    });
  }

  const { error: delErr } = await sb.from("delegations").upsert(delegations, { ignoreDuplicates: true });
  if (delErr) console.log("  delegations error:", delErr.message);
  else { console.log(`  Created ${delegations.length} delegations`); totalInserted += delegations.length; }

  // ---------------------------------------------------------------
  // 7. Accreditations (150)
  // ---------------------------------------------------------------
  console.log("\n7. Creating accreditations...");
  const accreditations = [];
  const usedAccred = new Set();

  for (let i = 0; i < 150; i++) {
    const comm = pick(communities);
    const giver = pick(userIds);
    const receiver = pick(userIds.filter(u => u !== giver));
    const key = `${giver}-${receiver}-${comm.id}`;
    if (usedAccred.has(key)) continue;
    usedAccred.add(key);

    accreditations.push({
      giver_id: giver,
      receiver_id: receiver,
      community_id: comm.id,
      subject_tag: comm.subject,
      weight: pick([1, 1, 1, 2, 3]),
      active: true,
    });
  }

  const { error: accErr } = await sb.from("accreditations").upsert(accreditations, { ignoreDuplicates: true });
  if (accErr) console.log("  accreditations error:", accErr.message);
  else { console.log(`  Created ${accreditations.length} accreditations`); totalInserted += accreditations.length; }

  // ---------------------------------------------------------------
  // 8. Accreditation scores (top users per community)
  // ---------------------------------------------------------------
  console.log("\n8. Creating accreditation scores...");
  const scores = [];

  for (const comm of communities) {
    const topUsers = pickN(userIds, randomInt(5, 15));
    topUsers.forEach((uid, rank) => {
      scores.push({
        user_id: uid,
        community_id: comm.id,
        subject_tag: comm.subject,
        score: parseFloat((20 - rank * 1.2 + Math.random() * 3).toFixed(2)),
        rank: rank + 1,
      });
    });
  }

  const { error: scoreErr } = await sb.from("accreditation_scores").upsert(scores, { ignoreDuplicates: true });
  if (scoreErr) console.log("  scores error:", scoreErr.message);
  else { console.log(`  Created ${scores.length} accreditation scores`); totalInserted += scores.length; }

  // ---------------------------------------------------------------
  // 9. Messages (200 across communities, both channels)
  // ---------------------------------------------------------------
  console.log("\n9. Creating messages...");
  const messages = [];

  for (let i = 0; i < 150; i++) {
    const comm = pick(communities);
    const author = pick(userIds);
    const age = randomInt(0, 60);

    messages.push({
      community_id: comm.id,
      author_id: author,
      content: pick(CHAT_MESSAGES),
      channel: "community",
      created_at: daysAgo(age),
    });
  }

  for (let i = 0; i < 50; i++) {
    const comm = pick(communities);
    const author = pick(userIds);
    const age = randomInt(0, 60);

    messages.push({
      community_id: comm.id,
      author_id: author,
      content: pick(QUORUM_MESSAGES),
      channel: "quorum",
      created_at: daysAgo(age),
    });
  }

  const { error: msgErr } = await sb.from("messages").insert(messages);
  if (msgErr) console.log("  messages error:", msgErr.message);
  else { console.log(`  Created ${messages.length} messages`); totalInserted += messages.length; }

  // ---------------------------------------------------------------
  // 10. More campaigns (30 across subjects)
  // ---------------------------------------------------------------
  console.log("\n10. Creating campaigns...");
  const campaigns = [];
  const usedCampaigns = new Set();

  // Check existing
  const { data: existingCamp } = await sb.from("campaigns").select("user_id, community_id");
  for (const c of existingCamp ?? []) {
    usedCampaigns.add(`${c.user_id}-${c.community_id}`);
  }

  for (let i = 0; i < 30; i++) {
    const comm = pick(communities);
    const user = pick(userIds);
    const key = `${user}-${comm.id}`;
    if (usedCampaigns.has(key)) continue;
    usedCampaigns.add(key);

    const pitchBase = pick(CAMPAIGN_PITCHES);
    campaigns.push({
      user_id: user,
      community_id: comm.id,
      pitch: pitchBase,
      experience: pick([
        "5 years in community governance and policy development.",
        "Background in public administration and stakeholder engagement.",
        "Active contributor to open-source governance projects.",
        "Professional mediator with cross-cultural facilitation experience.",
        "Data scientist focused on civic technology and public interest.",
        "Former elected local representative with budget oversight experience.",
        "Community organiser with track record in grassroots movements.",
        null,
      ]),
      goals: pick([
        "Increase community participation by 50% within one year.",
        "Establish monthly transparency reports and community Q&A sessions.",
        "Build partnerships with 3 aligned organisations this quarter.",
        "Create a mentorship pipeline for emerging community leaders.",
        "Implement data-driven decision metrics for all major proposals.",
        "Reduce response time on community issues to under 48 hours.",
        null,
      ]),
      active: true,
    });
  }

  const { error: campErr } = await sb.from("campaigns").upsert(campaigns, { onConflict: "user_id,community_id" });
  if (campErr) console.log("  campaigns error:", campErr.message);
  else { console.log(`  Created ${campaigns.length} campaigns`); totalInserted += campaigns.length; }

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log("\n=== Seed complete ===");
  console.log(`Total records created/updated: ~${totalInserted}`);

  // Final counts
  const tables = ["users","communities","community_memberships","proposals","votes","elections","election_votes","delegations","accreditations","accreditation_scores","messages","campaigns"];
  console.log("\nFinal table counts:");
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t}: ${count}`);
  }
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
