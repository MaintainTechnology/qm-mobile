import { Text, View } from 'react-native';
import { apiErrorMessage } from '@/lib/api';
import { spacing, type } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';
import { Notice } from '../trades/ui';
import { FollowupEventsSchema, followupEventsKey, NOTE_OUTCOMES } from './followups';
import { SectionLoading } from './SectionScreen';

export function FollowupHistory({ quoteId }: { quoteId: string }) {
  const { colors } = useTheme();
  const query = useApiQuery(
    followupEventsKey(quoteId),
    `/api/tenant/followups/events?quoteId=${encodeURIComponent(quoteId)}`,
    FollowupEventsSchema,
  );
  if (query.isPending) return <SectionLoading label="Loading contact history" />;
  if (!query.data || query.isError)
    return (
      <Notice
        tone="warn"
        label="Contact history unavailable"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data.events.length)
    return <Text style={[type.bodySm, { color: colors.textSec }]}>No contact history yet.</Text>;
  return (
    <View style={{ gap: spacing.md }}>
      {query.data.events.map(event => {
        const outcome = NOTE_OUTCOMES.find(([key]) => key === event.outcome)?.[1];
        const when = new Date(event.created_at);
        return (
          <View key={event.id} style={{ gap: spacing.xs }}>
            <Text style={[type.body, { color: colors.textPri }]}>
              {outcome ?? event.summary ?? event.kind}
            </Text>
            {event.note ? (
              <Text style={[type.bodySm, { color: colors.textSec }]}>{event.note}</Text>
            ) : null}
            <Text style={[type.bodySm, { color: colors.textDim }]}>
              {event.kind === 'note' ? 'Manual note' : event.kind === 'call' ? 'Call' : 'SMS'} ·{' '}
              {Number.isFinite(when.getTime()) ? when.toLocaleString('en-AU') : 'Time unavailable'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
