import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MESSAGES_BY_SUBJECT: Record<string, string[]> = {
  governance: [
    "Transparency in decision-making is the foundation of any governance system worth building.",
    "The delegation model here is fascinating. Liquid democracy could solve so many problems with traditional representative systems.",
    "We should consider ranked-choice voting for the next proposal round to better capture community preferences.",
    "The fractal community model addresses scale in a way that traditional governance structures simply cannot.",
    "Accountability mechanisms need strengthening. What happens when delegates consistently vote against their delegators' expressed preferences?",
    "Looking at the Ostrom principles, this platform addresses several of them remarkably well.",
    "Constitutional design should precede policy-making. We need to get the meta-rules right first.",
    "The balance between efficiency and inclusion in decision-making is the central tension here.",
    "We need to think about dispute resolution mechanisms before we actually need them.",
    "I would love to see more data on how delegation chains actually form in practice.",
  ],
  economics: [
    "The token economics here create genuinely interesting incentive alignment. The impact treasury model is novel.",
    "Community-level fiscal autonomy is going to be transformative for local economic development.",
    "The 2:1 minting ratio creates a built-in public goods funding mechanism. That is clever.",
    "We should track and publish community economic metrics. Transparency builds trust and attracts participation.",
    "The allocation mechanism reminds me of participatory budgeting, but with better granularity.",
    "Behavioral economics tells us that framing matters enormously. How we present economic choices to members will shape outcomes.",
    "Market dynamics in small community economies are fundamentally different from national ones.",
    "The relationship between token price stability and governance participation deserves more study.",
    "Community currencies historically succeed when they address a specific local need.",
    "Smart contracts could automate treasury distribution rules and reduce governance overhead.",
  ],
  education: [
    "The peer accreditation system could genuinely revolutionize how we think about credentials.",
    "We need to create learning pathways that help community members develop governance skills.",
    "The mentorship model embedded in delegation is an underappreciated educational mechanism.",
    "Assessment in this context should focus on demonstrated contribution, not test performance.",
    "Collaborative learning works best when there is genuine shared purpose. Governance provides that.",
    "Evidence-based approaches to community education should be the default.",
    "Digital literacy is a prerequisite for meaningful participation. We need to address that gap.",
    "The community itself is a learning environment. Every proposal debate is a teachable moment.",
    "We should create onboarding materials that make governance participation accessible to newcomers.",
    "Education should not just be about information transfer. It should build critical thinking capacity.",
  ],
  ecology: [
    "Every governance decision should include an environmental impact assessment.",
    "The community model is well suited to coordinating local environmental action.",
    "We should track carbon metrics for community-funded projects.",
    "Climate adaptation strategies should be developed at the community level, not just nationally.",
    "Renewable energy cooperatives are a natural fit for community governance models.",
    "Ecosystem restoration projects benefit enormously from community-level decision-making.",
    "Biodiversity loss is the crisis that gets the least governance attention. This platform could change that.",
    "The scientific evidence on climate change should inform every infrastructure proposal.",
    "Marine conservation requires cross-community coordination. The global level community is key.",
    "Urban ecology needs more representation in our governance discussions.",
  ],
  health: [
    "Community health outcomes correlate strongly with governance quality. This platform has real potential.",
    "Mental health resources should be integrated into community support structures.",
    "The social determinants of health are largely governance questions at their root.",
    "Preventive health measures are more effective when governed at the community level.",
    "Public health infrastructure benefits from the kind of participatory governance this platform enables.",
    "Community health workers could be funded through the treasury mechanism.",
    "Nutrition education and food security are governance issues that affect every community.",
    "Global health challenges require exactly the kind of multi-level governance this platform supports.",
    "Health data governance is its own challenge. Privacy and transparency must be balanced.",
    "Emergency preparedness planning is more effective when communities are actively involved.",
  ],
  technology: [
    "The smart contract architecture here provides a solid foundation for transparent governance.",
    "AI governance should be a priority subject. The decisions being made now will shape decades.",
    "Data sovereignty is a fundamental governance issue that communities need to address.",
    "The blockchain layer provides the immutability that governance decisions require.",
    "Open source principles should guide platform development. Transparency all the way down.",
    "The delegation mechanism is an elegant technical solution to the scalability problem.",
    "Machine learning could help identify emerging governance issues from community discussions.",
    "The UX of governance tools directly affects participation rates. Design matters.",
    "Privacy-preserving voting technology is essential for anonymous governance.",
    "The Base L2 choice gives us low transaction costs without sacrificing security.",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  const admin = getAdmin();

  // Verify caller is platform_admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user: authUser },
  } = await admin.auth.getUser(token);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("users")
    .select("id, platform_role")
    .eq("auth_id", authUser.id)
    .single();

  if (!profile || profile.platform_role !== "platform_admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Get all communities
  const { data: communities } = await admin
    .from("communities")
    .select("id, name, subject");

  if (!communities?.length) {
    return NextResponse.json({ error: "No communities" }, { status: 400 });
  }

  // Get all AI users with their community memberships
  const { data: aiUsers } = await admin
    .from("users")
    .select("id, display_name, ai_expertise")
    .eq("is_ai", true);

  if (!aiUsers?.length) {
    return NextResponse.json(
      { error: "No AI users found. Run seed script first." },
      { status: 400 }
    );
  }

  // Get non-AI users enrolled in communities (for delegation targets)
  const { data: humanMembers } = await admin
    .from("community_memberships")
    .select("user_id, community_id, users!inner(id, is_ai, email)")
    .eq("users.is_ai", false);

  // Build map: community_id -> human user IDs
  const humansByComm: Record<string, string[]> = {};
  for (const m of humanMembers || []) {
    if (!humansByComm[m.community_id]) humansByComm[m.community_id] = [];
    humansByComm[m.community_id].push(m.user_id);
  }

  // Get AI memberships
  const { data: aiMemberships } = await admin
    .from("community_memberships")
    .select("user_id, community_id")
    .in(
      "user_id",
      aiUsers.map((u) => u.id)
    );

  // Build map: user_id -> community_ids
  const commsByAi: Record<string, string[]> = {};
  for (const m of aiMemberships || []) {
    if (!commsByAi[m.user_id]) commsByAi[m.user_id] = [];
    commsByAi[m.user_id].push(m.community_id);
  }

  // Community subject lookup
  const commSubject: Record<string, string> = {};
  for (const c of communities) {
    commSubject[c.id] = c.subject;
  }

  // 1. Post one message per AI user in a random enrolled community
  const messages: {
    community_id: string;
    author_id: string;
    content: string;
    channel: string;
  }[] = [];

  for (const user of aiUsers) {
    const userComms = commsByAi[user.id] || [];
    if (!userComms.length) continue;
    const commId = pick(userComms);
    const subject = commSubject[commId] || "governance";
    const subjectMsgs =
      MESSAGES_BY_SUBJECT[subject] || MESSAGES_BY_SUBJECT.governance;
    messages.push({
      community_id: commId,
      author_id: user.id,
      content: pick(subjectMsgs),
      channel: "community",
    });
  }

  let messagesCreated = 0;
  for (let i = 0; i < messages.length; i += 500) {
    const batch = messages.slice(i, i + 500);
    const { error } = await admin.from("messages").insert(batch);
    if (!error) messagesCreated += batch.length;
  }

  // 2. Create delegations from AI users to human users in shared communities
  const delegations: {
    delegator_id: string;
    delegate_id: string;
    community_id: string;
    subject_tag: string;
  }[] = [];

  for (const user of aiUsers) {
    const userComms = commsByAi[user.id] || [];
    // Pick one community to delegate in (if humans present)
    for (const commId of userComms) {
      const humans = humansByComm[commId];
      if (!humans?.length) continue;
      const subject = commSubject[commId] || "governance";
      delegations.push({
        delegator_id: user.id,
        delegate_id: pick(humans),
        community_id: commId,
        subject_tag: subject,
      });
      break; // one delegation per AI user
    }
  }

  let delegationsCreated = 0;
  for (let i = 0; i < delegations.length; i += 500) {
    const batch = delegations.slice(i, i + 500);
    const { error } = await admin.from("delegations").upsert(batch, {
      onConflict: "delegator_id,community_id,subject_tag",
      ignoreDuplicates: true,
    });
    if (!error) delegationsCreated += batch.length;
  }

  // 3. Collect unique human users who received delegations for email notification
  const delegateIds = [...new Set(delegations.map((d) => d.delegate_id))];
  const { data: delegates } = await admin
    .from("users")
    .select("id, display_name, email")
    .in("id", delegateIds);

  // Count delegations per human
  const delegationCounts: Record<string, number> = {};
  for (const d of delegations) {
    delegationCounts[d.delegate_id] =
      (delegationCounts[d.delegate_id] || 0) + 1;
  }

  return NextResponse.json({
    success: true,
    messagesCreated,
    delegationsCreated,
    humansNotified: delegates?.length || 0,
    delegationCounts,
    summary: `${messagesCreated} messages posted, ${delegationsCreated} delegations created to ${delegates?.length || 0} human users.`,
  });
}
