import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field } from '@/features/auth/ui';
import { fonts, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { suburbFromAddress } from './address';
import { type AddressSuggestion, useAddressSuggestions } from './api';

export function JobAddressField({
  value,
  onChange,
  onSuburb,
}: {
  value: string;
  onChange: (value: string) => void;
  onSuburb: (value: string) => void;
}) {
  const { colors } = useTheme();
  const { mutateAsync } = useAddressSuggestions();
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = useRef<string | null>(null);
  const version = useRef(0);

  useEffect(() => {
    const current = ++version.current;
    setItems([]);
    setUnavailable(false);
    setBusy(false);
    const query = value.trim();
    if (query.length < 3 || query.length > 200 || value === selected.current) return;
    const timer = setTimeout(() => {
      setBusy(true);
      void mutateAsync({ query })
        .then(result => {
          if (version.current !== current) return;
          setItems(result.ok ? result.suggestions : []);
          setUnavailable(!result.ok);
        })
        .catch(() => {
          if (version.current === current) setUnavailable(true);
        })
        .finally(() => {
          if (version.current === current) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      version.current += 1;
    };
  }, [value, mutateAsync]);

  return (
    <View style={{ gap: spacing.sm }}>
      <Field
        label="Address"
        value={value}
        onChangeText={next => {
          selected.current = null;
          onChange(next);
        }}
        required
        height={54}
      />
      {busy || unavailable ? (
        <Text style={{ color: colors.textSec, fontFamily: fonts.sans.regular }}>
          {busy
            ? 'Looking up addresses…'
            : 'Address suggestions are unavailable. Enter the address and suburb manually.'}
        </Text>
      ) : null}
      {items.map(item => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Use address ${item.address}`}
          onPress={() => {
            selected.current = item.address;
            version.current += 1;
            setItems([]);
            onChange(item.address);
            const suburb = suburbFromAddress(item.address, item.state, item.postcode);
            // A newly selected address must not keep the prior suggestion's suburb.
            onSuburb(suburb ?? '');
          }}
          style={{
            minHeight: touch.minimum,
            justifyContent: 'center',
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.ctlLine,
          }}
        >
          <Text style={{ color: colors.textPri, fontFamily: fonts.sans.medium }}>
            {item.address}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
