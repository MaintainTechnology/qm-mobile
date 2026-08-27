// Home — the trade-hub workspace, matching the web dashboard's trade page
// (title, subtitle, SECTIONS/QUOTES counters, section chips, quote queue).
// Lands on Quotes, the web hub's own default section.
import { HubScreen } from '@/features/trades/hub/HubScreen';

export default function HomeRoute() {
  return <HubScreen initialSection="quotes" />;
}
