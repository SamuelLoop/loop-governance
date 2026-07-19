export type TemplateType = "campaign" | "flyer";

export function getCampaignTemplate(
  userName: string,
  communityName: string,
  subject: string,
  level: string
) {
  return {
    type: "doc" as const,
    content: [
      {
        type: "heading",
        attrs: { textAlign: "center", level: 1 },
        content: [{ type: "text", text: `Vote for ${userName}` }],
      },
      {
        type: "heading",
        attrs: { textAlign: "center", level: 2 },
        content: [
          {
            type: "text",
            text: `${communityName} Leadership`,
          },
        ],
      },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            marks: [{ type: "italic" }],
            text: `Standing for ${subject} governance at the ${level} level`,
          },
        ],
      },
      { type: "horizontalRule" },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Why I'm standing" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Replace this with your personal statement. What drives you to lead in this community? What experience do you bring? Be authentic and specific.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "What I'll do" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Priority 1: " },
                  { type: "text", text: "Describe your first key commitment" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Priority 2: " },
                  { type: "text", text: "Describe your second key commitment" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Priority 3: " },
                  { type: "text", text: "Describe your third key commitment" },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "My background" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Share relevant experience, qualifications, or achievements that make you the right person for this role.",
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: '"Add a short, memorable quote that captures your vision."',
              },
            ],
          },
        ],
      },
    ],
  };
}

export function getFlyerTemplate(
  communityName: string,
  subject: string,
  level: string
) {
  return {
    type: "doc" as const,
    content: [
      {
        type: "heading",
        attrs: { textAlign: "center", level: 1 },
        content: [{ type: "text", text: communityName }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          {
            type: "text",
            marks: [{ type: "bold" }],
            text: `Join the ${subject} community shaping decisions at the ${level} level`,
          },
        ],
      },
      { type: "horizontalRule" },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "What we do" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Describe what this community does. What ${subject} issues are you tackling? What decisions are being made? Why does it matter?`,
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Why join?" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Have your say: " },
                  { type: "text", text: "Vote on proposals that affect your area" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Earn rewards: " },
                  { type: "text", text: "Active participants receive LOOP tokens from the community treasury" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "Build reputation: " },
                  { type: "text", text: "Your governance power grows as you contribute" },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "What's happening now" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Highlight current proposals, upcoming elections, or recent achievements. Give people a reason to join right now.",
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: '"Your voice matters. Every member strengthens the community."',
              },
            ],
          },
        ],
      },
    ],
  };
}
