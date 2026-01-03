export type DemoMessage = {
  id: string;
  conversationId: string;
  sender: "You" | "Mark" | "FamilySync";
  text: string;
  createdAtISO: string;
};

export type DemoConversation = {
  id: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAtLabel: string;
  isPinned?: boolean;
};

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "announcements",
    title: "Family Announcements",
    lastMessagePreview: "Welcome to FamilySync — announcements will appear here.",
    lastMessageAtLabel: "Today",
    isPinned: true,
  },
  {
    id: "family",
    title: "Robson Family",
    lastMessagePreview: "School pickup moved to 3:45 — just a placeholder.",
    lastMessageAtLabel: "Today",
  },
  {
    id: "adults",
    title: "Adults",
    lastMessagePreview: "This is a demo thread layout for Phase 1.",
    lastMessageAtLabel: "Yesterday",
  },
];

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "a1",
    conversationId: "announcements",
    sender: "FamilySync",
    text: "Welcome to FamilySync. This space is for important family announcements (Phase 1 demo).",
    createdAtISO: "2025-12-27T09:00:00.000Z",
  },
  {
    id: "a2",
    conversationId: "announcements",
    sender: "FamilySync",
    text: "Later, this can include reminders, birthdays, school changes, and key notices.",
    createdAtISO: "2025-12-27T09:05:00.000Z",
  },
  {
    id: "m1",
    conversationId: "family",
    sender: "Mark",
    text: "Quick demo thread — this will become real chat later.",
    createdAtISO: "2025-12-27T10:00:00.000Z",
  },
  {
    id: "m2",
    conversationId: "family",
    sender: "You",
    text: "Nice. For Phase 1 we’re just locking the layout and flow.",
    createdAtISO: "2025-12-27T10:02:00.000Z",
  },
  {
    id: "m3",
    conversationId: "family",
    sender: "FamilySync",
    text: "System messages will land here later (birthdays, reminders, etc).",
    createdAtISO: "2025-12-27T10:05:00.000Z",
  },
  {
    id: "m4",
    conversationId: "adults",
    sender: "Mark",
    text: "Adults thread demo — future: private planning.",
    createdAtISO: "2025-12-26T20:30:00.000Z",
  },
  {
    id: "m5",
    conversationId: "adults",
    sender: "You",
    text: "Input is disabled in Phase 1. Messaging coming soon.",
    createdAtISO: "2025-12-26T20:32:00.000Z",
  },
];

export function getConversationById(conversationId: string) {
  return DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
}

export function getMessagesForConversation(conversationId: string) {
  return DEMO_MESSAGES.filter((m) => m.conversationId === conversationId);
}
