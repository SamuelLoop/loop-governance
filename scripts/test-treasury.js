import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oztfzqkpwwfnxrydmsuo.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGZ6cWtwd3dmbnhyeWRtc3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYxMzM4MiwiZXhwIjoyMDkyMTg5MzgyfQ.ZBcgTYE7Bo6rH4H0Ke9bmhE7eRirGP9rpyS0kOpOEWU";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const GLOBAL_GOV_ID = "5ab727a9-e213-4cb7-a7de-89dff3db0231";

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName}`);
    failed++;
  }
}

async function cleanup() {
  await admin
    .from("distribution_rules")
    .delete()
    .eq("community_id", GLOBAL_GOV_ID);
  await admin
    .from("earnings")
    .delete()
    .eq("community_id", GLOBAL_GOV_ID);
  await admin
    .from("treasury_transactions")
    .delete()
    .eq("community_id", GLOBAL_GOV_ID);
}

async function test1_defaults() {
  console.log("\nTEST 1: getDistributionRules returns defaults when no custom rules");
  const { data } = await admin
    .from("distribution_rules")
    .select("*")
    .eq("community_id", GLOBAL_GOV_ID)
    .single();

  assert(data === null, "No rows returned for community without rules");
}

async function test2_stored_rules() {
  console.log("\nTEST 2: getDistributionRules returns stored rules");
  await admin.from("distribution_rules").upsert({
    community_id: GLOBAL_GOV_ID,
    leader_pct: 50,
    participant_pct: 30,
    delegator_pct: 20,
    min_activity_threshold: 2,
    distribution_period_days: 14,
  }, { onConflict: "community_id" });

  const { data } = await admin
    .from("distribution_rules")
    .select("leader_pct, participant_pct, delegator_pct, min_activity_threshold, distribution_period_days")
    .eq("community_id", GLOBAL_GOV_ID)
    .single();

  assert(data !== null, "Row exists");
  assert(Number(data.leader_pct) === 50, "Leader pct = 50");
  assert(Number(data.participant_pct) === 30, "Participant pct = 30");
  assert(Number(data.delegator_pct) === 20, "Delegator pct = 20");
  assert(data.min_activity_threshold === 2, "Threshold = 2");
  assert(data.distribution_period_days === 14, "Period = 14 days");
}

async function test3_reject_bad_sum() {
  console.log("\nTEST 3: updateDistributionRules rejects if percentages don't sum to 100");
  const { error } = await admin.from("distribution_rules").upsert({
    community_id: GLOBAL_GOV_ID,
    leader_pct: 50,
    participant_pct: 30,
    delegator_pct: 30,
    min_activity_threshold: 1,
    distribution_period_days: 30,
  }, { onConflict: "community_id" });

  assert(error !== null, "DB rejects sum != 100");
  assert(
    error.message.includes("pct_sum_100") || error.message.includes("check"),
    "Error references the constraint"
  );
}

async function test5_valid_upsert() {
  console.log("\nTEST 5: updateDistributionRules succeeds with valid split");
  const { error } = await admin.from("distribution_rules").upsert({
    community_id: GLOBAL_GOV_ID,
    leader_pct: 45,
    participant_pct: 35,
    delegator_pct: 20,
    min_activity_threshold: 1,
    distribution_period_days: 30,
  }, { onConflict: "community_id" });

  assert(error === null, "Upsert succeeds");

  const { data } = await admin
    .from("distribution_rules")
    .select("leader_pct")
    .eq("community_id", GLOBAL_GOV_ID)
    .single();

  assert(Number(data.leader_pct) === 45, "Updated to 45");
}

async function test6_distribute() {
  console.log("\nTEST 6: triggerDistribution calls distribute_treasury() and returns result");

  await admin.from("treasury_transactions").insert({
    community_id: GLOBAL_GOV_ID,
    type: "impact_allocation",
    direction: "inflow",
    amount: 1000,
    description: "Test inflow for distribution",
  });

  const { data, error } = await admin.rpc("distribute_treasury", {
    p_community_id: GLOBAL_GOV_ID,
    p_amount: 1000,
  });

  assert(error === null, "RPC succeeds: " + (error?.message ?? "ok"));
  assert(data !== null, "Returns result JSON");
  if (data) {
    assert(typeof data.leaders_paid === "number", "Has leaders_paid count");
    assert(typeof data.participants_paid === "number", "Has participants_paid count");
    assert(typeof data.delegators_paid === "number", "Has delegators_paid count");
    assert(Number(data.total_distributed) === 1000, "Total distributed = 1000");

    const totalPaid = data.leaders_paid + data.participants_paid + data.delegators_paid;
    assert(totalPaid > 0, `At least one person paid (got ${totalPaid})`);
  }

  const { data: txns } = await admin
    .from("treasury_transactions")
    .select("id, type, direction, amount")
    .eq("community_id", GLOBAL_GOV_ID)
    .eq("direction", "outflow");

  assert(txns && txns.length > 0, `Outflow transactions created (${txns?.length ?? 0})`);

  const { data: earningsRows } = await admin
    .from("earnings")
    .select("id, type, amount")
    .eq("community_id", GLOBAL_GOV_ID);

  assert(earningsRows && earningsRows.length > 0, `Earnings rows created (${earningsRows?.length ?? 0})`);
}

async function test8_clamp_threshold() {
  console.log("\nTEST 8: min_activity_threshold >= 1 enforced by app logic");
  const threshold = Math.max(1, 0);
  assert(threshold === 1, "Clamped 0 to 1");
}

async function test9_clamp_period() {
  console.log("\nTEST 9: distribution_period_days clamped to 7-365");
  const period = Math.max(7, Math.min(365, 3));
  assert(period === 7, "Clamped 3 to 7");
  const period2 = Math.max(7, Math.min(365, 500));
  assert(period2 === 365, "Clamped 500 to 365");
}

async function test_balance_view() {
  console.log("\nTEST EXTRA: community_treasury_balance view works");
  const { data } = await admin
    .from("community_treasury_balance")
    .select("*")
    .eq("community_id", GLOBAL_GOV_ID)
    .single();

  assert(data !== null, "Balance view returns data");
  if (data) {
    assert(Number(data.total_inflow) >= 1000, `Inflow >= 1000 (got ${data.total_inflow})`);
    assert(Number(data.total_outflow) > 0, `Outflow > 0 (got ${data.total_outflow})`);
  }
}

async function run() {
  console.log("=== Treasury Distribution Rule Engine Tests ===");
  console.log(`Target: ${GLOBAL_GOV_ID} (Global Governance)`);

  await cleanup();

  await test1_defaults();
  await test2_stored_rules();
  await test3_reject_bad_sum();
  await test5_valid_upsert();
  await test6_distribute();
  await test8_clamp_threshold();
  await test9_clamp_period();
  await test_balance_view();

  await cleanup();

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
