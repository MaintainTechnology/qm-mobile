import { RouteRecovery } from '@/components/RouteRecovery';

export default function NotFoundScreen() {
  return (
    <RouteRecovery
      title="We couldn't find that screen"
      message="The link may be old, incomplete, or for a record you no longer have access to. Nothing was changed."
    />
  );
}
