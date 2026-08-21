import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ChatsScreen } from '@/features/chats/ChatsScreen';

/**
 * A `?chatId=` search param (e.g. a future push-notification deep link) opens that conversation's
 * thread on mount, and re-opens it if the param changes while already mounted — same pattern as
 * the Quotes tab's `?quoteId=`. Cleared on back so a re-render doesn't reopen a thread the tradie
 * just closed.
 */
export default function ChatsRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatId?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.chatId ?? null);

  useEffect(() => {
    if (params.chatId) setSelectedId(params.chatId);
  }, [params.chatId]);

  function closeThread() {
    setSelectedId(null);
    if (params.chatId) router.setParams({ chatId: undefined });
  }

  return <ChatsScreen selectedId={selectedId} onSelect={setSelectedId} onBack={closeThread} />;
}
