import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { GhostButton } from '@/features/auth/ui';
import { apiUrl } from '@/lib/env';
import { spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { roofFootprints, type OwnedRoof } from './owned-roof';
import { Card, Notice, SectionLabel } from '../ui';

export function RoofGeometry({ roof, selected, onSelect }: {
  roof: Pick<OwnedRoof, 'quote' | 'public_token' | 'provider'>;
  selected: number[]; onSelect: (index: number) => void;
}) {
  const { colors } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const [showAerial, setShowAerial] = useState(false);
  const polygons = roofFootprints(roof);
  return <Card style={{ gap: spacing.md }}>
    <SectionLabel>Building selection</SectionLabel>
    {polygons.length ? <>
      <Text style={{ color: colors.textSec }}>Saved footprints · {roof.provider ?? 'source unavailable'}. Tap an outline to include or exclude it. This diagram does not change measured geometry.</Text>
      <ScrollView horizontal><ScrollView style={{ height: 320 }} nestedScrollEnabled>
        <Svg width={300 * zoom} height={300 * zoom} viewBox="0 0 300 300" accessibilityLabel="Saved building footprints">
          {polygons.map(polygon => <Polygon key={polygon.index} points={polygon.points}
            fill={selected.includes(polygon.index) ? colors.accent : colors.inkCard}
            stroke={colors.textPri} strokeWidth={2}
            accessibilityLabel={`Building ${polygon.index}, ${selected.includes(polygon.index) ? 'included' : 'excluded'}`}
            onPress={() => onSelect(polygon.index)} />)}
        </Svg>
      </ScrollView></ScrollView>
      <GhostButton label={zoom === 1 ? 'Enlarge footprint view' : 'Reset footprint view'} onPress={() => setZoom(zoom === 1 ? 2 : 1)} />
    </> : <Notice tone="warn" label="Footprint geometry unavailable" body="Review and select the measured buildings in the list below." />}
    {roof.public_token ? <>
      <GhostButton label={showAerial ? 'Hide aerial image' : 'View saved-job aerial image'} onPress={() => { setShowAerial(!showAerial); setImageFailed(false); }} />
      {showAerial && (imageFailed ? <Notice tone="warn" label="Aerial image unavailable" body="Imagery may be unconfigured, outside coverage or temporarily unavailable. Your saved measurements remain available." /> :
        <Image source={{ uri: apiUrl(`/api/roofing/q/${encodeURIComponent(roof.public_token)}/static-map?fit=1`) }}
          style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="contain" cachePolicy="none"
          accessibilityLabel="Google Maps aerial of the saved property" onError={() => setImageFailed(true)} />)}
    </> : null}
  </Card>;
}
