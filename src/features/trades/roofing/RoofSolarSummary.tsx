import { Text } from 'react-native';
import { z } from 'zod';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { useTheme } from '@/lib/useTheme';
import { Card, Notice, SectionLabel } from '../ui';

const Detection = z.object({ summary_note:z.string(), confidence:z.string(), source:z.string(), notes:z.string(),
  has_solar:z.boolean(),array_count:z.number().int().nonnegative(),has_skylight:z.boolean(),skylight_count:z.number().int().nonnegative() });
const Solar = z.object({ detection:Detection,
  allowance:z.object({ applies:z.boolean(), inc_gst:z.number().finite().nonnegative(), detail:z.string(), electrician_note:z.string() }).nullable(),
  perStructure:z.array(z.object({ buildingId:z.string().nullable(),label:z.string(),detection:Detection })).optional(),
  structuresSkipped:z.number().int().nonnegative().optional() });
export function RoofSolarSummary({ value }: { value: unknown }) {
  const { colors } = useTheme(); const parsed = Solar.safeParse(value);
  if (!parsed.success) return <Notice tone="warn" label="Solar and skylight scan unavailable" body="No complete saved detection is available. Confirm equipment on site before relying on the scope." />;
  const solar = parsed.data; const style = { color:colors.textSec };
  return <Card><SectionLabel>Saved solar and skylight review</SectionLabel>
    <Text style={style}>{solar.detection.summary_note}</Text><Text style={style}>{solar.detection.confidence} confidence · {solar.detection.source}</Text>
    <Text style={style}>{solar.detection.notes}</Text>
    {solar.perStructure?.map((structure,index)=><Text key={`${structure.buildingId}:${index}`} style={style}>{structure.label}: {structure.detection.summary_note}</Text>)}
    {!!solar.structuresSkipped && <Text style={style}>{solar.structuresSkipped} building(s) were not scanned.</Text>}
    {solar.allowance ? <Text style={style}>{solar.allowance.applies ? `Saved allowance: ${formatAud(centsFromApiDollars(solar.allowance.inc_gst))}` : 'No allowance applied'} · {solar.allowance.detail}{'\n'}{solar.allowance.electrician_note}</Text> : null}
  </Card>;
}
