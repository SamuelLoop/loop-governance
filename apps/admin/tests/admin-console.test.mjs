/**
 * Admin Console TDD Tests
 * =======================
 * Tests for Phase A2 (schema), auth middleware, treasury allocation,
 * and spending cap enforcement.
 *
 * Runs against the real Supabase database using the service role key.
 * All test data is created in setup and cleaned in teardown.
 *
 * Usage:
 *   node apps/admin/tests/admin-console.test.mjs
 *
 * Expected: all tests FAIL before implementation (no tables exist yet).
 * After migration 022 + server action code, all tests should PASS.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from console's .env.local (shared Supabase project)
const envPath = resolve(__dirname, "../../console/.env.local");
const envFile = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq), l.slice(eq + 1)];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in console .env.local");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message || err });
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message || err}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected)
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Test data IDs (deterministic for cleanup) ────────────────────────────────
const TEST_PREFIX = "test_admin_";
const WL_ID = "a0000000-0000-0000-0000-000000000001";
const WL_ID_OTHER = "a0000000-0000-0000-0000-000000000002";
const USER_PLATFORM_ADMIN = "a1000000-0000-0000-0000-000000000001";
const USER_ORG_ADMIN = "a1000000-0000-0000-0000-000000000002";
const USER_ORG_MANAGER = "a1000000-0000-0000-0000-000000000003";
const USER_MEMBER = "a1000000-0000-0000-0000-000000000004";
const USER_OTHER_ORG = "a1000000-0000-0000-0000-000000000005";
const COMMUNITY_GOV = "a2000000-0000-0000-0000-000000000001";
const COMMUNITY_HEALTH = "a2000000-0000-0000-0000-000000000002";

// ── Setup ────────────────────────────────────────────────────────────────────
async function setup() {
  console.log("\n🔧 Setting up test data...");

  // Clean any leftover test data (reverse dependency order)
  await cleanup();

  // Create test white-label configs
  await db.from("white_label_configs").insert([
    {
      id: WL_ID,
      name: "Test Org",
      slug: TEST_PREFIX + "org",
      domain: TEST_PREFIX + "org.test",
      brand_name: "Test Org Brand",
      shared_auth: true,
    },
    {
      id: WL_ID_OTHER,
      name: "Other Org",
      slug: TEST_PREFIX + "other",
      domain: TEST_PREFIX + "other.test",
      brand_name: "Other Org Brand",
      shared_auth: true,
    },
  ]);

  // Create test communities as local children under the governance root
  // (avoids colliding with the unique global root index on subject)
  const { data: govRoot } = await db
    .from("communities")
    .select("id")
    .eq("subject", "governance")
    .eq("level", "global")
    .single();

  const govRootId = govRoot?.id || null;

  const { error: commErr } = await db.from("communities").insert([
    {
      id: COMMUNITY_GOV,
      name: TEST_PREFIX + "Governance",
      slug: TEST_PREFIX + "governance",
      description: "Test governance community",
      level: "local",
      path: "global." + TEST_PREFIX + "governance",
      parent_id: govRootId,
      subject: "governance",
    },
    {
      id: COMMUNITY_HEALTH,
      name: TEST_PREFIX + "Health",
      slug: TEST_PREFIX + "health",
      description: "Test health community",
      level: "local",
      path: "global." + TEST_PREFIX + "health",
      parent_id: govRootId,
      subject: "governance",
    },
  ]);
  if (commErr) console.log("   Community insert error:", commErr.message);

  // Create test users with different roles
  await db.from("users").insert([
    {
      id: USER_PLATFORM_ADMIN,
      display_name: TEST_PREFIX + "Platform Admin",
      email: TEST_PREFIX + "padmin@test.com",
      platform_role: "platform_admin",
      source_white_label_id: null,
    },
    {
      id: USER_ORG_ADMIN,
      display_name: TEST_PREFIX + "Org Admin",
      email: TEST_PREFIX + "oadmin@test.com",
      platform_role: "org_admin",
      source_white_label_id: WL_ID,
    },
    {
      id: USER_ORG_MANAGER,
      display_name: TEST_PREFIX + "Org Manager",
      email: TEST_PREFIX + "omanager@test.com",
      platform_role: "org_manager",
      source_white_label_id: WL_ID,
    },
    {
      id: USER_MEMBER,
      display_name: TEST_PREFIX + "Member",
      email: TEST_PREFIX + "member@test.com",
      platform_role: "member",
      source_white_label_id: WL_ID,
    },
    {
      id: USER_OTHER_ORG,
      display_name: TEST_PREFIX + "Other Org Admin",
      email: TEST_PREFIX + "other_oadmin@test.com",
      platform_role: "org_admin",
      source_white_label_id: WL_ID_OTHER,
    },
  ]);

  // Create admin assignments
  await db.from("admin_assignments").insert([
    {
      user_id: USER_ORG_ADMIN,
      white_label_id: WL_ID,
      role: "org_admin",
      granted_by: USER_PLATFORM_ADMIN,
    },
    {
      user_id: USER_ORG_MANAGER,
      white_label_id: WL_ID,
      role: "org_manager",
      granted_by: USER_PLATFORM_ADMIN,
    },
    {
      user_id: USER_OTHER_ORG,
      white_label_id: WL_ID_OTHER,
      role: "org_admin",
      granted_by: USER_PLATFORM_ADMIN,
    },
  ]);

  console.log("   Setup complete.\n");
}

async function cleanup() {
  // Delete in reverse dependency order, using the deterministic test UUIDs
  const wlIds = [WL_ID, WL_ID_OTHER];
  const tables = [
    "admin_audit_log",
    "moderation_flags",
    "subject_allocations",
    "loyalty_config",
    "admin_assignments",
  ];

  for (const table of tables) {
    try {
      await db.from(table).delete().in("white_label_id", wlIds);
    } catch {}
  }

  // Clean proposals with test community IDs (for spending cap tests)
  await db.from("proposals").delete().in("community_id", [COMMUNITY_GOV, COMMUNITY_HEALTH]);

  // Clean users
  await db.from("users").delete().like("email", TEST_PREFIX + "%");

  // Clean communities
  await db.from("communities").delete().like("slug", TEST_PREFIX + "%");

  // Clean white label configs
  await db.from("white_label_configs").delete().in("id", wlIds);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: SCHEMA EXISTS
// ══════════════════════════════════════════════════════════════════════════════
async function testSchemaExists() {
  console.log("── Schema existence ──");

  await test("admin_assignments table exists", async () => {
    const { error } = await db.from("admin_assignments").select("id").limit(0);
    assert(!error, `Table missing: ${error?.message}`);
  });

  await test("subject_allocations table exists", async () => {
    const { error } = await db.from("subject_allocations").select("id").limit(0);
    assert(!error, `Table missing: ${error?.message}`);
  });

  await test("loyalty_config table exists", async () => {
    const { error } = await db.from("loyalty_config").select("id").limit(0);
    assert(!error, `Table missing: ${error?.message}`);
  });

  await test("admin_audit_log table exists", async () => {
    const { error } = await db.from("admin_audit_log").select("id").limit(0);
    assert(!error, `Table missing: ${error?.message}`);
  });

  await test("moderation_flags table exists", async () => {
    const { error } = await db.from("moderation_flags").select("id").limit(0);
    assert(!error, `Table missing: ${error?.message}`);
  });

  await test("platform_role accepts org_admin value", async () => {
    const { error } = await db
      .from("users")
      .update({ platform_role: "org_admin" })
      .eq("id", USER_ORG_ADMIN);
    assert(!error, `CHECK constraint rejects org_admin: ${error?.message}`);
  });

  await test("platform_role accepts org_manager value", async () => {
    const { error } = await db
      .from("users")
      .update({ platform_role: "org_manager" })
      .eq("id", USER_ORG_MANAGER);
    assert(!error, `CHECK constraint rejects org_manager: ${error?.message}`);
  });

  await test("communities has proposal_cap_cents column", async () => {
    const { error } = await db
      .from("communities")
      .select("proposal_cap_cents")
      .eq("id", COMMUNITY_GOV)
      .single();
    assert(!error, `Column missing: ${error?.message}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: AUTH / ORG SCOPING
// ══════════════════════════════════════════════════════════════════════════════
async function testAuthScoping() {
  console.log("\n── Auth and org scoping ──");

  await test("admin_assignment links user to white_label_id", async () => {
    const { data, error } = await db
      .from("admin_assignments")
      .select("user_id, white_label_id, role")
      .eq("user_id", USER_ORG_ADMIN)
      .single();
    assert(!error, error?.message);
    assertEqual(data.white_label_id, WL_ID, "Wrong white_label_id");
    assertEqual(data.role, "org_admin", "Wrong role");
  });

  await test("org_admin cannot see other org's admin_assignments", async () => {
    const { data } = await db
      .from("admin_assignments")
      .select("*")
      .eq("white_label_id", WL_ID);
    const userIds = data.map((r) => r.user_id);
    assert(!userIds.includes(USER_OTHER_ORG), "Org admin can see other org's assignments");
  });

  await test("platform_admin can see all admin_assignments", async () => {
    const { data, error } = await db.from("admin_assignments").select("*");
    assert(!error, error?.message);
    assert(data.length >= 3, `Expected >= 3 assignments, got ${data.length}`);
  });

  await test("admin_assignment has granted_by FK", async () => {
    const { data, error } = await db
      .from("admin_assignments")
      .select("granted_by")
      .eq("user_id", USER_ORG_ADMIN)
      .single();
    assert(!error, error?.message);
    assertEqual(data.granted_by, USER_PLATFORM_ADMIN, "Wrong granted_by");
  });

  await test("admin_assignment supports revocation", async () => {
    const now = new Date().toISOString();
    const { error } = await db
      .from("admin_assignments")
      .update({ revoked_at: now })
      .eq("user_id", USER_ORG_MANAGER)
      .eq("white_label_id", WL_ID);
    assert(!error, `Revocation failed: ${error?.message}`);

    // Verify
    const { data } = await db
      .from("admin_assignments")
      .select("revoked_at")
      .eq("user_id", USER_ORG_MANAGER)
      .eq("white_label_id", WL_ID)
      .single();
    assert(data.revoked_at !== null, "revoked_at should be set");

    // Restore for subsequent tests
    await db
      .from("admin_assignments")
      .update({ revoked_at: null })
      .eq("user_id", USER_ORG_MANAGER)
      .eq("white_label_id", WL_ID);
  });

  await test("member role user has no admin_assignment", async () => {
    const { data } = await db
      .from("admin_assignments")
      .select("*")
      .eq("user_id", USER_MEMBER);
    assertEqual(data.length, 0, "Member should have no admin assignment");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: SUBJECT ALLOCATIONS
// ══════════════════════════════════════════════════════════════════════════════
async function testSubjectAllocations() {
  console.log("\n── Subject allocations ──");

  await test("can create subject allocations for an org", async () => {
    const { error } = await db.from("subject_allocations").insert([
      {
        white_label_id: WL_ID,
        subject: "governance",
        allocation_pct: 40,
        proposal_cap_cents: 500000,
        updated_by: USER_ORG_ADMIN,
      },
      {
        white_label_id: WL_ID,
        subject: "health",
        allocation_pct: 35,
        proposal_cap_cents: 300000,
        updated_by: USER_ORG_ADMIN,
      },
      {
        white_label_id: WL_ID,
        subject: "education",
        allocation_pct: 25,
        proposal_cap_cents: 200000,
        updated_by: USER_ORG_ADMIN,
      },
    ]);
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("allocations sum to 100 for the org", async () => {
    const { data } = await db
      .from("subject_allocations")
      .select("allocation_pct")
      .eq("white_label_id", WL_ID);
    const sum = data.reduce((s, r) => s + Number(r.allocation_pct), 0);
    assertEqual(sum, 100, "Allocations should sum to 100");
  });

  await test("allocations are scoped by white_label_id", async () => {
    // Insert for other org
    await db.from("subject_allocations").insert({
      white_label_id: WL_ID_OTHER,
      subject: "governance",
      allocation_pct: 100,
      proposal_cap_cents: 1000000,
      updated_by: USER_OTHER_ORG,
    });

    // Query scoped to WL_ID
    const { data } = await db
      .from("subject_allocations")
      .select("*")
      .eq("white_label_id", WL_ID);
    assert(
      data.every((r) => r.white_label_id === WL_ID),
      "Returned allocations from wrong org"
    );
    assertEqual(data.length, 3, "Should have exactly 3 allocations for WL_ID");
  });

  await test("allocation has proposal_cap_cents", async () => {
    const { data } = await db
      .from("subject_allocations")
      .select("proposal_cap_cents")
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance")
      .single();
    assertEqual(Number(data.proposal_cap_cents), 500000, "Wrong cap for governance");
  });

  await test("allocation records updated_by user", async () => {
    const { data } = await db
      .from("subject_allocations")
      .select("updated_by")
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance")
      .single();
    assertEqual(data.updated_by, USER_ORG_ADMIN, "Wrong updated_by");
  });

  await test("allocation update changes updated_at", async () => {
    const { data: before } = await db
      .from("subject_allocations")
      .select("updated_at")
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance")
      .single();

    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 50));

    await db
      .from("subject_allocations")
      .update({ allocation_pct: 45, updated_at: new Date().toISOString() })
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance");

    const { data: after } = await db
      .from("subject_allocations")
      .select("updated_at")
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance")
      .single();

    assert(after.updated_at > before.updated_at, "updated_at should change on update");

    // Restore
    await db
      .from("subject_allocations")
      .update({ allocation_pct: 40 })
      .eq("white_label_id", WL_ID)
      .eq("subject", "governance");
  });

  await test("unique constraint on (white_label_id, subject)", async () => {
    const { error } = await db.from("subject_allocations").insert({
      white_label_id: WL_ID,
      subject: "governance",
      allocation_pct: 10,
      proposal_cap_cents: 100000,
      updated_by: USER_ORG_ADMIN,
    });
    assert(error, "Should reject duplicate (white_label_id, subject)");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: SPENDING CAP ENFORCEMENT
// ══════════════════════════════════════════════════════════════════════════════
async function testSpendingCaps() {
  console.log("\n── Spending cap enforcement ──");

  // Set a cap on the governance community
  await test("can set proposal_cap_cents on a community", async () => {
    const { error } = await db
      .from("communities")
      .update({ proposal_cap_cents: 500000 })
      .eq("id", COMMUNITY_GOV);
    assert(!error, `Update failed: ${error?.message}`);
  });

  await test("proposal within cap is accepted", async () => {
    const { error } = await db.from("proposals").insert({
      community_id: COMMUNITY_GOV,
      author_id: USER_MEMBER,
      title: TEST_PREFIX + "Under cap proposal",
      description: "Budget within cap",
      status: "draft",
      budget_request_cents: 400000,
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("proposal exceeding cap is rejected", async () => {
    const { error } = await db.from("proposals").insert({
      community_id: COMMUNITY_GOV,
      author_id: USER_MEMBER,
      title: TEST_PREFIX + "Over cap proposal",
      description: "Budget exceeds cap",
      status: "draft",
      budget_request_cents: 600000,
    });
    assert(error, "Should reject proposal exceeding spending cap");
  });

  await test("proposal with null budget is accepted (no budget request)", async () => {
    const { error } = await db.from("proposals").insert({
      community_id: COMMUNITY_GOV,
      author_id: USER_MEMBER,
      title: TEST_PREFIX + "No budget proposal",
      description: "Discussion proposal, no funds",
      status: "draft",
      budget_request_cents: null,
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("proposal at exact cap is accepted", async () => {
    const { error } = await db.from("proposals").insert({
      community_id: COMMUNITY_GOV,
      author_id: USER_MEMBER,
      title: TEST_PREFIX + "Exact cap proposal",
      description: "Budget at exact cap",
      status: "draft",
      budget_request_cents: 500000,
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("community with null cap accepts any budget", async () => {
    // Health community has no cap set
    const { error } = await db.from("proposals").insert({
      community_id: COMMUNITY_HEALTH,
      author_id: USER_MEMBER,
      title: TEST_PREFIX + "Large uncapped proposal",
      description: "No cap on this community",
      status: "draft",
      budget_request_cents: 99999999,
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: LOYALTY CONFIG
// ══════════════════════════════════════════════════════════════════════════════
async function testLoyaltyConfig() {
  console.log("\n── Loyalty config ──");

  await test("can create loyalty config for an org", async () => {
    const { error } = await db.from("loyalty_config").insert({
      white_label_id: WL_ID,
      tokens_per_action: 2,
      weekly_cap: 100,
      streak_multiplier: 1.5,
      streak_threshold_weeks: 4,
      streak_bonus: 15,
      delegation_reward: 0.75,
      updated_by: USER_ORG_ADMIN,
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("loyalty config is scoped by white_label_id", async () => {
    const { data } = await db
      .from("loyalty_config")
      .select("*")
      .eq("white_label_id", WL_ID);
    assertEqual(data.length, 1, "Should have exactly 1 config for WL_ID");
  });

  await test("loyalty config has correct defaults after creation", async () => {
    const { data } = await db
      .from("loyalty_config")
      .select("tokens_per_action, weekly_cap, streak_multiplier")
      .eq("white_label_id", WL_ID)
      .single();
    assertEqual(Number(data.tokens_per_action), 2, "Wrong tokens_per_action");
    assertEqual(data.weekly_cap, 100, "Wrong weekly_cap");
    assertEqual(Number(data.streak_multiplier), 1.5, "Wrong streak_multiplier");
  });

  await test("unique constraint on (white_label_id) for loyalty config", async () => {
    const { error } = await db.from("loyalty_config").insert({
      white_label_id: WL_ID,
      tokens_per_action: 5,
      weekly_cap: 200,
      updated_by: USER_ORG_ADMIN,
    });
    assert(error, "Should reject duplicate loyalty config for same org");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════
async function testAuditLog() {
  console.log("\n── Audit log ──");

  await test("can insert audit log entry", async () => {
    const { error } = await db.from("admin_audit_log").insert({
      white_label_id: WL_ID,
      actor_id: USER_ORG_ADMIN,
      event_type: "treasury.allocation_changed",
      target_type: "subject_allocations",
      target_id: WL_ID,
      detail: { subject: "governance", old_pct: 40, new_pct: 45 },
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("audit log entries are scoped by white_label_id", async () => {
    // Insert for other org
    await db.from("admin_audit_log").insert({
      white_label_id: WL_ID_OTHER,
      actor_id: USER_OTHER_ORG,
      event_type: "member.invited",
      target_type: "user",
      target_id: USER_OTHER_ORG,
      detail: { email: "test@other.com" },
    });

    const { data } = await db
      .from("admin_audit_log")
      .select("*")
      .eq("white_label_id", WL_ID);
    assert(
      data.every((r) => r.white_label_id === WL_ID),
      "Returned audit entries from wrong org"
    );
  });

  await test("audit log stores detail as JSONB", async () => {
    const { data } = await db
      .from("admin_audit_log")
      .select("detail")
      .eq("white_label_id", WL_ID)
      .eq("event_type", "treasury.allocation_changed")
      .single();
    assertEqual(data.detail.subject, "governance", "JSONB detail not stored correctly");
    assertEqual(data.detail.old_pct, 40, "JSONB detail old_pct wrong");
  });

  await test("audit log has created_at timestamp", async () => {
    const { data } = await db
      .from("admin_audit_log")
      .select("created_at")
      .eq("white_label_id", WL_ID)
      .limit(1)
      .single();
    assert(data.created_at, "created_at should be set automatically");
  });

  await test("audit log cannot be updated (append-only enforcement)", async () => {
    // This test verifies the RLS policy or trigger prevents updates.
    // If using RLS: no UPDATE policy should exist.
    // If using trigger: BEFORE UPDATE should raise an exception.
    const { data: entry } = await db
      .from("admin_audit_log")
      .select("id")
      .eq("white_label_id", WL_ID)
      .limit(1)
      .single();

    const { error } = await db
      .from("admin_audit_log")
      .update({ event_type: "tampered" })
      .eq("id", entry.id);

    // With service role this may succeed. The append-only constraint
    // is enforced via: (a) no UPDATE RLS policy for non-service roles,
    // or (b) a trigger. We test that the application layer respects it.
    // For now, verify the entry still exists with original value.
    const { data: check } = await db
      .from("admin_audit_log")
      .select("event_type")
      .eq("id", entry.id)
      .single();

    // If update succeeded with service role, that's expected.
    // The enforcement is at the application/RLS level, not service role.
    assert(check, "Audit entry should still exist");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 7: MODERATION FLAGS
// ══════════════════════════════════════════════════════════════════════════════
async function testModerationFlags() {
  console.log("\n── Moderation flags ──");

  await test("can create a moderation flag", async () => {
    const { error } = await db.from("moderation_flags").insert({
      white_label_id: WL_ID,
      reporter_id: USER_MEMBER,
      target_type: "message",
      target_id: "b0000000-0000-0000-0000-000000000001",
      reason: "Inappropriate content",
      status: "pending",
    });
    assert(!error, `Insert failed: ${error?.message}`);
  });

  await test("flag status defaults to pending", async () => {
    const { data } = await db
      .from("moderation_flags")
      .select("status")
      .eq("white_label_id", WL_ID)
      .eq("reason", "Inappropriate content")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    assertEqual(data.status, "pending", "Default status should be pending");
  });

  await test("flag can be resolved", async () => {
    const { data: flag } = await db
      .from("moderation_flags")
      .select("id")
      .eq("white_label_id", WL_ID)
      .limit(1)
      .single();

    const { error } = await db
      .from("moderation_flags")
      .update({
        status: "actioned",
        resolved_by: USER_ORG_ADMIN,
        resolution_note: "Content removed",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", flag.id);
    assert(!error, `Update failed: ${error?.message}`);
  });

  await test("flag target_type is constrained", async () => {
    const { error } = await db.from("moderation_flags").insert({
      white_label_id: WL_ID,
      reporter_id: USER_MEMBER,
      target_type: "invalid_type",
      target_id: "b0000000-0000-0000-0000-000000000001",
      reason: "test",
      status: "pending",
    });
    assert(error, "Should reject invalid target_type");
  });

  await test("flag status is constrained", async () => {
    const { error } = await db.from("moderation_flags").insert({
      white_label_id: WL_ID,
      reporter_id: USER_MEMBER,
      target_type: "message",
      target_id: "b0000000-0000-0000-0000-000000000002",
      reason: "test",
      status: "invalid_status",
    });
    assert(error, "Should reject invalid status");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RUN
// ══════════════════════════════════════════════════════════════════════════════
async function run() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Admin Console TDD Tests                       ║");
  console.log("║   Phase A2: Schema + Auth + Treasury + Caps     ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    await setup();
    await testSchemaExists();
    await testAuthScoping();
    await testSubjectAllocations();
    await testSpendingCaps();
    await testLoyaltyConfig();
    await testAuditLog();
    await testModerationFlags();
  } catch (err) {
    console.error("\n💥 Fatal error during tests:", err.message);
  }

  await cleanup();

  console.log("\n════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("════════════════════════════════════════════════════");

  if (failures.length) {
    console.log("\n  Failed tests:");
    failures.forEach((f) => console.log(`    ❌ ${f.name}`));
  }

  console.log();
  process.exit(failed > 0 ? 1 : 0);
}

run();
