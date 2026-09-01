import { RouteRecovery } from '@/components/RouteRecovery';

export default function InvalidLinkScreen() {
  return (
    <RouteRecovery
      title="That link isn't safe to open"
      message="QuoteMax only opens verified app destinations. Check the newest message or return home and find the job from your workspace."
    />
  );
}
