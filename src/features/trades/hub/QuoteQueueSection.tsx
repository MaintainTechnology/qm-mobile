import { UnifiedQuoteQueue } from '@/features/quotes/UnifiedQuoteQueue';
import type { HubTrade } from './sections';

export function QuoteQueueSection({ trade }: { trade: HubTrade }) {
  return <UnifiedQuoteQueue key={trade} contextTrade={trade} />;
}
