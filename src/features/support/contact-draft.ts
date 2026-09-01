import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  CONTACT_TOPICS,
  EMPTY_CONTACT_DRAFT,
  type ContactDraft,
  type ContactTopic,
} from './contact-contract';

const CONTACT_DRAFT_KEY = 'quotemax.public-contact-draft.v1';

function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === 'string' && CONTACT_TOPICS.includes(value as ContactTopic);
}

export function parseStoredContactDraft(value: string | null): ContactDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof ContactDraft, unknown>>;
    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.phone !== 'string' ||
      !isContactTopic(parsed.topic) ||
      typeof parsed.message !== 'string'
    ) {
      return null;
    }
    return {
      name: parsed.name.slice(0, 100),
      email: parsed.email.slice(0, 200),
      phone: parsed.phone.slice(0, 40),
      topic: parsed.topic,
      message: parsed.message.slice(0, 4000),
    };
  } catch {
    return null;
  }
}

export async function loadContactDraft(): Promise<ContactDraft> {
  if (Platform.OS === 'web') return EMPTY_CONTACT_DRAFT;
  try {
    return (
      parseStoredContactDraft(await SecureStore.getItemAsync(CONTACT_DRAFT_KEY)) ??
      EMPTY_CONTACT_DRAFT
    );
  } catch {
    return EMPTY_CONTACT_DRAFT;
  }
}

export async function saveContactDraft(draft: ContactDraft): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(CONTACT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Draft persistence must never turn a support request into a false send.
  }
}

export async function clearContactDraft(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(CONTACT_DRAFT_KEY);
  } catch {
    // The server receipt remains authoritative even if local cleanup fails.
  }
}
