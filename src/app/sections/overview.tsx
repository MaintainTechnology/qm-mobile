// Overview — the web dashboard's Overview tab. The former Home ('Today')
// screen IS that overview: KPIs, attention card, your number, recent quotes
// and chats. Re-mounted here since the trade hub took the Home tab.
import { useRouter } from 'expo-router';

import { HomeScreen } from '@/features/home/HomeScreen';

export default function OverviewRoute() {
  const router = useRouter();
  return (
    <HomeScreen onBack={() => (router.canGoBack() ? router.back() : router.replace('/menu'))} />
  );
}
