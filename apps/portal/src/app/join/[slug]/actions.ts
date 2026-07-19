"use server";

import { createServiceClient } from "@/lib/supabase-server";

export type EnrollmentState = {
  step: number;
  error?: string;
  subject: string;
  authId?: string;
  communities?: string[];
};

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  Nigeria: "Africa", "South Africa": "Africa", Kenya: "Africa",
  Ghana: "Africa", Ethiopia: "Africa", Tanzania: "Africa",
  Egypt: "Africa", Morocco: "Africa", Senegal: "Africa",
  Uganda: "Africa", Rwanda: "Africa", Cameroon: "Africa",
  USA: "Americas", Canada: "Americas", Mexico: "Americas",
  Brazil: "Americas", Argentina: "Americas", Colombia: "Americas",
  Chile: "Americas", Peru: "Americas", Venezuela: "Americas",
  Japan: "Asia", India: "Asia", China: "Asia",
  "South Korea": "Asia", Indonesia: "Asia", Thailand: "Asia",
  Vietnam: "Asia", Philippines: "Asia", Malaysia: "Asia",
  Singapore: "Asia", Pakistan: "Asia", Bangladesh: "Asia",
  Taiwan: "Asia", "Hong Kong": "Asia",
  UK: "Europe", France: "Europe", Germany: "Europe",
  Italy: "Europe", Spain: "Europe", Netherlands: "Europe",
  Belgium: "Europe", Switzerland: "Europe", Austria: "Europe",
  Sweden: "Europe", Norway: "Europe", Denmark: "Europe",
  Finland: "Europe", Poland: "Europe", Portugal: "Europe",
  Ireland: "Europe", "Czech Republic": "Europe", Romania: "Europe",
  Greece: "Europe", Hungary: "Europe", Croatia: "Europe",
  Russia: "Europe", Ukraine: "Europe",
  UAE: "Middle East", "Saudi Arabia": "Middle East",
  Israel: "Middle East", Turkey: "Middle East",
  Australia: "Oceania", "New Zealand": "Oceania",
};

function parseLocation(loc: string): {
  city: string;
  country: string;
  continent: string;
} | null {
  const parts = loc.split(",").map((s) => s.trim());
  if (parts.length < 2) return null;
  const city = parts[0];
  const country = parts[parts.length - 1];
  const continent = COUNTRY_TO_CONTINENT[country] ?? "Other";
  return { city, country, continent };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function ensureSubjectTree(
  admin: ReturnType<typeof createServiceClient>,
  subject: string,
  location: { city: string; country: string; continent: string }
): Promise<{ communityIds: string[]; communityNames: string[] }> {
  const ids: string[] = [];
  const names: string[] = [];

  // 1. Ensure global root for this subject
  let { data: root } = await admin
    .from("communities")
    .select("id, name")
    .eq("subject", subject)
    .eq("level", "global")
    .is("parent_id", null)
    .single();

  if (!root) {
    const subjectLabel =
      subject.charAt(0).toUpperCase() + subject.slice(1);
    const { data: created } = await admin
      .from("communities")
      .insert({
        name: `${subjectLabel}: Global`,
        slug: `${subject}-global`,
        level: "global",
        path: `${subject}`,
        subject,
        quorum_size: 10,
        dunbar_limit: 150,
      })
      .select("id, name")
      .single();
    root = created;
  }

  if (!root) return { communityIds: ids, communityNames: names };
  ids.push(root.id);
  names.push(root.name);

  // 2. Ensure continental community
  const continentSlug = slugify(location.continent);
  let { data: continent } = await admin
    .from("communities")
    .select("id, name")
    .eq("subject", subject)
    .eq("level", "continental")
    .eq("parent_id", root.id)
    .eq("slug", continentSlug)
    .single();

  if (!continent) {
    const subjectLabel =
      subject.charAt(0).toUpperCase() + subject.slice(1);
    const { data: created } = await admin
      .from("communities")
      .insert({
        name: `${subjectLabel}: ${location.continent}`,
        slug: continentSlug,
        level: "continental",
        path: `${subject}.${continentSlug.replace(/-/g, "_")}`,
        parent_id: root.id,
        subject,
        quorum_size: 10,
        dunbar_limit: 150,
      })
      .select("id, name")
      .single();
    continent = created;
  }

  if (!continent) return { communityIds: ids, communityNames: names };
  ids.push(continent.id);
  names.push(continent.name);

  // 3. Ensure national community
  const countrySlug = slugify(location.country);
  let { data: national } = await admin
    .from("communities")
    .select("id, name")
    .eq("subject", subject)
    .eq("level", "national")
    .eq("parent_id", continent.id)
    .eq("slug", countrySlug)
    .single();

  if (!national) {
    const subjectLabel =
      subject.charAt(0).toUpperCase() + subject.slice(1);
    const { data: created } = await admin
      .from("communities")
      .insert({
        name: `${subjectLabel}: ${location.country}`,
        slug: countrySlug,
        level: "national",
        path: `${subject}.${continentSlug.replace(/-/g, "_")}.${countrySlug.replace(/-/g, "_")}`,
        parent_id: continent.id,
        subject,
        quorum_size: 5,
        dunbar_limit: 150,
      })
      .select("id, name")
      .single();
    national = created;
  }

  if (!national) return { communityIds: ids, communityNames: names };
  ids.push(national.id);
  names.push(national.name);

  // 4. Ensure city community
  const citySlug = slugify(location.city);
  let { data: city } = await admin
    .from("communities")
    .select("id, name")
    .eq("subject", subject)
    .eq("level", "city")
    .eq("parent_id", national.id)
    .eq("slug", citySlug)
    .single();

  if (!city) {
    const subjectLabel =
      subject.charAt(0).toUpperCase() + subject.slice(1);
    const { data: created } = await admin
      .from("communities")
      .insert({
        name: `${subjectLabel}: ${location.city}`,
        slug: citySlug,
        level: "city",
        path: `${subject}.${continentSlug.replace(/-/g, "_")}.${countrySlug.replace(/-/g, "_")}.${citySlug.replace(/-/g, "_")}`,
        parent_id: national.id,
        subject,
        quorum_size: 3,
        dunbar_limit: 150,
      })
      .select("id, name")
      .single();
    city = created;
  }

  if (!city) return { communityIds: ids, communityNames: names };
  ids.push(city.id);
  names.push(city.name);

  return { communityIds: ids, communityNames: names };
}

export async function submitEnrollment(
  _prev: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  const admin = createServiceClient();
  const step = Number(formData.get("step"));
  const subject = formData.get("subject") as string;

  if (step === 1) {
    const email = formData.get("email") as string;
    const displayName = formData.get("displayName") as string;
    const location = formData.get("location") as string;

    if (!email || !displayName) {
      return { step: 1, error: "Name and email are required.", subject };
    }
    if (!location || !location.includes(",")) {
      return {
        step: 1,
        error: "Please enter your location as City, Country.",
        subject,
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
        return { step: 1, error: authError.message, subject };
      }
      const { data: existing } = await admin
        .from("users")
        .select("auth_id")
        .eq("email", email)
        .single();
      if (existing) {
        authId = existing.auth_id;
      } else {
        const {
          data: { users },
        } = await admin.auth.admin.listUsers();
        const found = users.find((u) => u.email === email);
        if (!found) {
          return { step: 1, error: "Could not find account.", subject };
        }
        authId = found.id;
      }
    } else {
      authId = authData.user.id;
    }

    const { error: userError } = await admin.from("users").upsert(
      {
        auth_id: authId,
        display_name: displayName,
        email,
        location_name: location.trim(),
      },
      { onConflict: "auth_id" }
    );

    if (userError) {
      return { step: 1, error: userError.message, subject };
    }

    return { step: 2, subject, authId };
  }

  if (step === 2) {
    const authId = formData.get("authId") as string;

    if (!authId) {
      return { step: 1, error: "Session lost. Please start over.", subject };
    }

    const { data: profile } = await admin
      .from("users")
      .select("id, location_name")
      .eq("auth_id", authId)
      .single();

    if (!profile) {
      return {
        step: 2,
        error: "Profile not found.",
        subject,
        authId,
      };
    }

    const location = parseLocation(profile.location_name ?? "");
    if (!location) {
      return {
        step: 1,
        error: "Could not parse your location. Use format: City, Country.",
        subject,
      };
    }

    const { communityIds, communityNames } = await ensureSubjectTree(
      admin,
      subject,
      location
    );

    for (const communityId of communityIds) {
      const { error: memberError } = await admin
        .from("community_memberships")
        .insert({
          user_id: profile.id,
          community_id: communityId,
          role: "member",
        });

      if (memberError && !memberError.message.includes("duplicate")) {
        console.error(
          `Failed to add to community ${communityId}:`,
          memberError
        );
      }
    }

    return {
      step: 3,
      subject,
      communities: communityNames,
    };
  }

  return { step: 1, subject };
}
