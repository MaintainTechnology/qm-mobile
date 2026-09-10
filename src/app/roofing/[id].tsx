import { useLocalSearchParams } from 'expo-router';
import { OwnedRoofScreen } from '@/features/trades/roofing/OwnedRoofScreen';

export default function SavedRoofRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <OwnedRoofScreen id={typeof id === 'string' ? id : ''} />;
}
