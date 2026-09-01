import { z } from 'zod';

export const CONTACT_TOPICS = [
  'General enquiry',
  'Pricing and plans',
  'My trade is not listed',
  'Partnership',
  'Something else',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  topic: ContactTopic;
  message: string;
};

export type ContactFieldErrors = Partial<Record<keyof ContactDraft, string>>;

export const EMPTY_CONTACT_DRAFT: ContactDraft = {
  name: '',
  email: '',
  phone: '',
  topic: 'General enquiry',
  message: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

export const ContactResponseSchema = z.object({ ok: z.literal(true) });

export type ContactValidationResult =
  { ok: true; value: ContactDraft } | { ok: false; errors: ContactFieldErrors };

/** Mirrors the public `/api/contact` bounds before any network write begins. */
export function validateContactDraft(draft: ContactDraft): ContactValidationResult {
  const value: ContactDraft = {
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    topic: draft.topic,
    message: draft.message.trim(),
  };
  const errors: ContactFieldErrors = {};

  if (!value.name) errors.name = 'Please add your name.';
  else if (value.name.length > 100) errors.name = 'Please keep your name under 100 characters.';

  if (!value.email || value.email.length > 200 || !EMAIL_RE.test(value.email)) {
    errors.email = 'Please enter an email we can reply to.';
  }
  if (value.phone.length > 40) errors.phone = 'That mobile number looks too long.';
  if (!CONTACT_TOPICS.includes(value.topic)) errors.topic = 'Choose a support topic.';
  if (value.message.length < 10) {
    errors.message = 'Please add at least 10 characters so we can help.';
  } else if (value.message.length > 4000) {
    errors.message = 'Please keep your message under 4000 characters.';
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function contactSubmissionGate(
  submitting: boolean,
  online: boolean,
): 'busy' | 'offline' | null {
  if (submitting) return 'busy';
  if (!online) return 'offline';
  return null;
}
