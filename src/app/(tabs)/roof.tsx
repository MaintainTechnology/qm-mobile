// Tools tab — the same trade-hub workspace as Home (the web dashboard's
// Trades tab: Quotes, Tools, Pricing, Services & brands, Catalogue, Recipes,
// Estimating), landing on the Tools section. Route stays named `roof` because
// the tab bar keys TAB_META by route name.
import { HubScreen } from '@/features/trades/hub/HubScreen';

export default function ToolsRoute() {
  return <HubScreen initialSection="tools" />;
}
