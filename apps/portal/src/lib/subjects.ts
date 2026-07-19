export type SubjectConfig = {
  slug: string;
  name: string;
  description: string;
  accent: string;
  accentLight: string;
  icon: string;
  benefits: string[];
};

export const SUBJECTS: Record<string, SubjectConfig> = {
  governance: {
    slug: "governance",
    name: "Governance",
    description:
      "Shape how communities make decisions. Participate in democratic processes, propose policies, and build transparent institutions from the ground up.",
    accent: "#f59e0b",
    accentLight: "#fbbf24",
    icon: "⚖",
    benefits: [
      "Vote on community proposals and fund allocations",
      "Stand for election to your local quorum",
      "Delegate your vote to trusted representatives",
      "Accredit peers for their knowledge and expertise",
    ],
  },
  economics: {
    slug: "economics",
    name: "Economics",
    description:
      "Build fairer economies. Trade commodities, fund community projects, and develop economic models that serve people over profit.",
    accent: "#10b981",
    accentLight: "#34d399",
    icon: "📊",
    benefits: [
      "Post trade listings for commodities and services",
      "Propose and vote on community fund allocations",
      "Participate in local economic planning",
      "Access community trading networks",
    ],
  },
  ecology: {
    slug: "ecology",
    name: "Ecology",
    description:
      "Protect and restore ecosystems. Coordinate environmental action, monitor biodiversity, and govern natural resources collectively.",
    accent: "#22c55e",
    accentLight: "#4ade80",
    icon: "🌍",
    benefits: [
      "Coordinate local environmental initiatives",
      "Vote on ecological protection proposals",
      "Monitor and report on biodiversity",
      "Connect with global conservation networks",
    ],
  },
  education: {
    slug: "education",
    name: "Education",
    description:
      "Reimagine learning. Build community-driven education systems, share knowledge freely, and ensure everyone has access to quality learning.",
    accent: "#6366f1",
    accentLight: "#818cf8",
    icon: "📚",
    benefits: [
      "Propose and vote on education initiatives",
      "Share knowledge within your community",
      "Accredit educators and mentors",
      "Fund community learning programmes",
    ],
  },
  health: {
    slug: "health",
    name: "Health",
    description:
      "Govern health collectively. Coordinate community health initiatives, allocate resources, and ensure equitable access to care.",
    accent: "#ef4444",
    accentLight: "#f87171",
    icon: "❤️",
    benefits: [
      "Vote on community health priorities",
      "Coordinate local health initiatives",
      "Fund health infrastructure proposals",
      "Connect with health professionals globally",
    ],
  },
  technology: {
    slug: "technology",
    name: "Technology",
    description:
      "Govern technology democratically. Shape how communities adopt, regulate, and benefit from technological progress.",
    accent: "#3b82f6",
    accentLight: "#60a5fa",
    icon: "⚙️",
    benefits: [
      "Vote on technology adoption proposals",
      "Govern data and privacy standards",
      "Fund open-source community infrastructure",
      "Shape AI and automation policy",
    ],
  },
  agriculture: {
    slug: "agriculture",
    name: "Agriculture",
    description:
      "Feed communities sustainably. Coordinate food systems, support local farmers, and govern agricultural resources collectively.",
    accent: "#84cc16",
    accentLight: "#a3e635",
    icon: "🌾",
    benefits: [
      "Coordinate local food systems",
      "Vote on agricultural policy",
      "Trade produce within community networks",
      "Fund sustainable farming initiatives",
    ],
  },
  energy: {
    slug: "energy",
    name: "Energy",
    description:
      "Power communities fairly. Govern energy resources, coordinate renewable transitions, and ensure equitable access.",
    accent: "#eab308",
    accentLight: "#facc15",
    icon: "⚡",
    benefits: [
      "Vote on community energy proposals",
      "Coordinate renewable energy projects",
      "Govern energy distribution and pricing",
      "Fund clean energy infrastructure",
    ],
  },
  housing: {
    slug: "housing",
    name: "Housing",
    description:
      "Build homes, not just houses. Govern housing policy, coordinate community development, and ensure everyone has a place to live.",
    accent: "#f97316",
    accentLight: "#fb923c",
    icon: "🏠",
    benefits: [
      "Vote on housing and development proposals",
      "Coordinate community building projects",
      "Govern land use and zoning decisions",
      "Fund affordable housing initiatives",
    ],
  },
  culture: {
    slug: "culture",
    name: "Arts & Culture",
    description:
      "Celebrate and protect culture. Govern cultural institutions, fund the arts, and preserve heritage through democratic participation.",
    accent: "#d946ef",
    accentLight: "#e879f9",
    icon: "🎨",
    benefits: [
      "Vote on cultural funding proposals",
      "Coordinate community arts programmes",
      "Preserve and share cultural heritage",
      "Fund local artists and institutions",
    ],
  },
};

export function getSubject(slug: string): SubjectConfig | undefined {
  return SUBJECTS[slug];
}

export function getAllSubjects(): SubjectConfig[] {
  return Object.values(SUBJECTS);
}
