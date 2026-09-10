import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Field } from '@/features/auth/ui';
import { spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAddressSuggestions, type AddressSuggestion } from '../jobquote/api';

export function RoofAddressField({ value, onChange, onSelect }: {
  value: string; onChange: (value: string) => void; onSelect: (value: AddressSuggestion) => void;
}) {
  const { colors } = useTheme(); const suggest = useAddressSuggestions();
  const request = suggest.mutateAsync; const version = useRef(0); const chosen = useRef<string | null>(null);
  const [rows, setRows] = useState<AddressSuggestion[]>([]); const [failed, setFailed] = useState(false);
  useEffect(() => {
    const current = ++version.current; setRows([]); setFailed(false);
    if (value.trim().length < 3 || value.length > 200 || chosen.current === value) return;
    const timer = setTimeout(() => void request({ query: value.trim() }).then(result => {
      if (current === version.current) { setRows(result.ok ? result.suggestions : []); setFailed(!result.ok); }
    }).catch(() => { if (current === version.current) setFailed(true); }), 250);
    return () => { clearTimeout(timer); version.current += 1; };
  }, [value, request]);
  return <View style={{ gap: spacing.sm }}>
    <Field label="Address" value={value} onChangeText={next => { chosen.current = null; onChange(next.slice(0,300)); }} required height={54} />
    {failed ? <Text style={{ color: colors.textSec }}>Suggestions unavailable. Enter the address, postcode and state manually.</Text> : null}
    {rows.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Use ${row.address}`}
      style={{ minHeight: touch.minimum, padding: spacing.md, borderWidth: 1, borderColor: colors.ctlLine }}
      onPress={() => { chosen.current = row.address; version.current += 1; setRows([]); onSelect(row); }}>
      <Text style={{ color: colors.textPri }}>{row.address}</Text>
    </Pressable>)}
  </View>;
}
