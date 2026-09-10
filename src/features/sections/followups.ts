import { z } from 'zod';

export const FOLLOWUPS_KEY = ['tenant', 'followups'] as const;
export const NOTE_OUTCOMES = [
  ['spoke', 'Spoke with customer'],
  ['left_voicemail', 'Left voicemail'],
  ['no_answer', 'No answer'],
  ['wants_callback', 'Wants callback'],
  ['not_interested', 'Not interested'],
  ['other', 'Other'],
] as const;

export const FollowupItemSchema = z.looseObject({
  kind: z.enum(['quote', 'lead']),
  quote_id: z.string().nullish(),
  conversation_id: z.string().nullish(),
  share_token: z.string().nullish(),
  quote_kind: z.string().nullish(),
  status: z.string().nullish(),
  paid_at: z.string().nullish(),
  accepted_at: z.string().nullish(),
  followup_reason: z.string().nullish(),
  last_activity: z.string().nullish(),
  age_hours: z.number().nullish(),
  total_inc_gst: z.number().finite().nonnegative().nullish(),
  selected_tier: z.string().nullish(),
  job_type: z.string().nullish(),
  needs_inspection: z.boolean().nullish(),
  followed_up_at: z.string().nullish(),
  followup_note: z.string().nullish(),
  customer: z
    .looseObject({
      first_name: z.string().nullish(),
      full_name: z.string().nullish(),
      phone: z.string().nullish(),
      suburb: z.string().nullish(),
      email: z.string().nullish(),
    })
    .nullish(),
});
export type FollowupItem = z.infer<typeof FollowupItemSchema>;
export const FollowupsSchema = z.looseObject({ followups: z.array(FollowupItemSchema) });

/** The discriminant owns the destination. A lead must never hit quote-only APIs. */
export function followupTarget(item: FollowupItem) {
  return item.kind === 'quote'
    ? item.quote_id
      ? { quoteId: item.quote_id }
      : null
    : item.conversation_id
      ? { conversationId: item.conversation_id }
      : null;
}
export function followupKey(item: FollowupItem): string {
  return `${item.kind}:${item.kind === 'quote' ? item.quote_id : item.conversation_id}`;
}
export function chaseableFollowups(items: FollowupItem[]) {
  return items.filter(
    item =>
      followupTarget(item) &&
      (item.kind === 'lead' ||
        (item.quote_kind !== 'balance' &&
          !item.paid_at &&
          !item.accepted_at &&
          item.status !== 'paid' &&
          item.status !== 'accepted')),
  );
}
export function followupCategory(item: FollowupItem) {
  return item.job_type?.trim().toLowerCase() || 'uncategorised';
}
function categoryLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function followupCategories(items: FollowupItem[]): readonly (readonly [string, string])[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = followupCategory(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [
    ['all', `All categories (${items.length})`],
    ...[...counts]
      .sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))
      .map(([key, count]) => [key, `${categoryLabel(key)} (${count})`] as const),
  ];
}
export function filterFollowups(items: FollowupItem[], category: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    if (category !== 'all' && followupCategory(item) !== category) return false;
    const digits = (item.customer?.phone ?? '').replace(/\D/g, '');
    const hay = [
      item.customer?.full_name,
      item.customer?.first_name,
      item.customer?.suburb,
      item.customer?.phone,
      item.customer?.email,
      digits,
      digits.replace(/^61(?=\d{9}$)/, '0'),
      item.job_type,
      categoryLabel(followupCategory(item)),
      item.share_token,
      item.quote_id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.every(term => hay.includes(term));
  });
}

export function suggestedFollowupText(item: FollowupItem) {
  const name = item.customer?.first_name?.trim() || 'there';
  const job = item.job_type?.replaceAll('_', ' ').trim();
  const subject =
    item.kind === 'lead'
      ? `${job ? `${job} ` : ''}enquiry`
      : `${job ? `${job} ` : ''}quote${item.share_token ? ` (code ${item.share_token})` : ''}`;
  // Current follow-up DTO has no proven tax basis. Do not label its amount GST-inclusive.
  return `Hi ${name}, just following up on your ${subject}. Happy to answer any questions or arrange a time — just reply to this message.`.slice(
    0,
    640,
  );
}

export const FollowupEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['note', 'call', 'sms']),
      outcome: z.string().nullable(),
      summary: z.string().nullable(),
      note: z.string().nullable(),
      created_at: z.string(),
      actor_user_id: z.string().nullable(),
    }),
  ),
});
export const followupEventsKey = (id: string) => [...FOLLOWUPS_KEY, 'events', id] as const;
export const FollowupDraftSchema = z.object({
  text: z.string().max(640).nullable(),
  logNote: z.string().max(500),
  outcome: z.enum(['spoke', 'left_voicemail', 'no_answer', 'wants_callback', 'not_interested', 'other']),
}).strict();
export type FollowupDraft = z.infer<typeof FollowupDraftSchema>;
export const emptyFollowupDraft = (): FollowupDraft => ({
  text: null,
  logNote: '',
  outcome: 'spoke',
});
