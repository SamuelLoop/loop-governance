"use server";

import { createServiceClient } from "@/lib/supabase-server";

export type SimilarCommunity = {
  id: string;
  name: string;
  subject: string;
  level: string;
  memberCount: number;
  description: string | null;
};

export type CreateState = {
  step: "form" | "similar" | "auth" | "success";
  error?: string;
  similar?: SimilarCommunity[];
  formData?: {
    name: string;
    description: string;
    subject: string;
    visibility: string;
    level: string;
  };
  communityId?: string;
  communityName?: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const common = wordsA.filter((w) => wordsB.includes(w));
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return 0;
  return common.length / union.size;
}

async function findSimilar(
  admin: ReturnType<typeof createServiceClient>,
  name: string,
  subject: string
): Promise<SimilarCommunity[]> {
  const { data: communities } = await admin
    .from("communities")
    .select("id, name, subject, level, description")
    .eq("visibility", "public");

  if (!communities) return [];

  const matches: (SimilarCommunity & { score: number })[] = [];

  for (const c of communities) {
    const nameScore = similarity(name, c.name);
    const subjectBonus = c.subject === subject ? 0.1 : 0;
    const total = nameScore + subjectBonus;

    if (total >= 0.3) {
      const { count } = await admin
        .from("community_memberships")
        .select("*", { count: "exact", head: true })
        .eq("community_id", c.id);

      matches.push({
        id: c.id,
        name: c.name,
        subject: c.subject,
        level: c.level,
        memberCount: count ?? 0,
        description: c.description,
        score: total,
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _, ...rest }) => rest);
}

export async function checkSimilarity(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const subject = formData.get("subject") as string;
  const visibility = formData.get("visibility") as string;
  const level = formData.get("level") as string;

  if (!name || name.length < 3) {
    return { step: "form", error: "Community name must be at least 3 characters." };
  }
  if (!description || description.length < 10) {
    return { step: "form", error: "Please provide a description (at least 10 characters)." };
  }
  if (!subject) {
    return { step: "form", error: "Please select a subject." };
  }
  if (!level) {
    return { step: "form", error: "Please select a scope." };
  }

  const admin = createServiceClient();
  const similar = await findSimilar(admin, name, subject);

  const fd = { name, description, subject, visibility: visibility || "public", level };

  if (similar.length > 0) {
    return { step: "similar", similar, formData: fd };
  }

  return { step: "auth", formData: fd };
}

export async function createCommunity(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const admin = createServiceClient();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subject = formData.get("subject") as string;
  const visibility = formData.get("visibility") as string;
  const level = formData.get("level") as string;
  const email = (formData.get("email") as string)?.trim();
  const displayName = (formData.get("displayName") as string)?.trim();

  if (!email || !displayName) {
    return {
      step: "auth",
      error: "Name and email are required.",
      formData: { name, description, subject, visibility, level },
    };
  }

  let authId: string;
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

  if (authError) {
    if (!authError.message.includes("already been registered")) {
      return {
        step: "auth",
        error: authError.message,
        formData: { name, description, subject, visibility, level },
      };
    }
    const { data: existing } = await admin
      .from("users")
      .select("auth_id")
      .eq("email", email)
      .single();
    if (existing) {
      authId = existing.auth_id;
    } else {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const found = users.find((u) => u.email === email);
      if (!found) {
        return {
          step: "auth",
          error: "Could not find account.",
          formData: { name, description, subject, visibility, level },
        };
      }
      authId = found.id;
    }
  } else {
    authId = authData.user.id;
  }

  const { error: userError } = await admin.from("users").upsert(
    { auth_id: authId, display_name: displayName, email },
    { onConflict: "auth_id" }
  );
  if (userError) {
    return {
      step: "auth",
      error: userError.message,
      formData: { name, description, subject, visibility, level },
    };
  }

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();

  if (!profile) {
    return {
      step: "auth",
      error: "Profile not found.",
      formData: { name, description, subject, visibility, level },
    };
  }

  const slug = slugify(name);

  let parentId: string | null = null;
  let path = `${subject}.custom.${slug.replace(/-/g, "_")}`;

  if (level !== "global") {
    const { data: root } = await admin
      .from("communities")
      .select("id")
      .eq("subject", subject)
      .eq("level", "global")
      .is("parent_id", null)
      .single();

    if (root) {
      parentId = root.id;
      path = `${subject}.${slug.replace(/-/g, "_")}`;
    }
  }

  const { data: community, error: createError } = await admin
    .from("communities")
    .insert({
      name,
      slug,
      description,
      level,
      path,
      parent_id: parentId,
      subject,
      visibility,
      quorum_size: visibility === "private" ? 5 : 10,
      dunbar_limit: 150,
    })
    .select("id, name")
    .single();

  if (createError) {
    if (createError.message.includes("duplicate")) {
      return {
        step: "auth",
        error: "A community with this name already exists in this subject.",
        formData: { name, description, subject, visibility, level },
      };
    }
    return {
      step: "auth",
      error: createError.message,
      formData: { name, description, subject, visibility, level },
    };
  }

  await admin.from("community_memberships").insert({
    user_id: profile.id,
    community_id: community.id,
    role: "admin",
  });

  return {
    step: "success",
    communityId: community.id,
    communityName: community.name,
  };
}
