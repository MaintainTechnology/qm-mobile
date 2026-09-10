import { StyleSheet, Text, TextInput, View } from 'react-native';
import { GhostButton } from '@/features/auth/ui';
import { PillOption, SectionLabel } from '@/features/trades/ui';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { STUDIO_TEXT_LENGTH, StudioDraftSlideSchema, type StudioSlide } from './studio-contract';
import { STUDIO_PHOTOS } from './studio-presets';

function CopyField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const { colors } = useTheme();
  return <View style={styles.field}><Text style={[type.label, { color: colors.textSec }]}>{label}</Text>
    <TextInput accessibilityLabel={label} accessibilityState={{ disabled }} value={value} onChangeText={onChange} editable={!disabled} multiline maxLength={STUDIO_TEXT_LENGTH}
      selectionColor={colors.accent} style={[styles.input, { color: colors.textPri, backgroundColor: colors.ink, borderColor: colors.ctlLine }]} />
  </View>;
}
function Choices({ options, value, onChange, disabled }: { options: readonly (readonly [string, string])[]; value: string; onChange: (value: string) => void; disabled: boolean }) {
  return <View accessibilityRole="radiogroup" style={styles.choices}>{options.map(([id, label]) =>
    <PillOption key={id} label={label} selected={value === id} disabled={disabled} onPress={() => onChange(id)} />)}</View>;
}
function Labels({ label, value, onChange, disabled }: { label: string; value: string[]; onChange: (apply: (current: string[]) => string[]) => void; disabled: boolean }) {
  return <View style={styles.group}><SectionLabel>{label}</SectionLabel>
    {value.map((entry, index) => <View key={index} style={styles.group}>
      <CopyField label={`${label} ${index + 1}`} value={entry} onChange={next => onChange(current => current.map((item, i) => i === index ? next : item))} disabled={disabled} />
      <GhostButton label={`Remove ${label.toLowerCase()} ${index + 1}`} disabled={disabled} onPress={() => onChange(current => current.filter((_, i) => i !== index))} />
    </View>)}
    {value.length < 6 && <GhostButton label={`Add ${label.toLowerCase()}`} disabled={disabled} onPress={() => onChange(current => current.length < 6 ? [...current, ''] : current)} />}
  </View>;
}
type StudioEdit = (current: StudioSlide) => StudioSlide;
function tupleEdit(current: StudioSlide, field: 'lines' | 'cards' | 'steps', row: number, column: number, text: string): StudioSlide {
  const rows = field === 'lines' && current.kind === 'stat' ? current.lines : field === 'cards' && current.kind === 'list' ? current.cards : field === 'steps' && current.kind === 'steps' ? current.steps : null;
  if (!rows || !rows[row] || column < 0 || column >= rows[row].length) return current;
  return StudioDraftSlideSchema.parse({ ...current, [field]: rows.map((entry, i) => i === row ? entry.map((value, j) => j === column ? text : value) : entry) });
}
export function StudioFields({ slide, onChange, disabled }: { slide: StudioSlide; onChange: (apply: StudioEdit) => void; disabled: boolean }) {
  const { colors } = useTheme();
  const change = (apply: StudioEdit) => { if (!disabled) onChange(apply); };
  const field = (label: string, value: string, key: 'h' | 'sub' | 'quote' | 'btn') => <CopyField label={label} value={value} disabled={disabled}
    onChange={next => change(current => StudioDraftSlideSchema.parse({ ...current, [key]: next }))} />;
  const cell = (label: string, value: string, key: 'lines' | 'cards' | 'steps', row: number, column: number) => <CopyField label={label} value={value} disabled={disabled}
    onChange={next => change(current => tupleEdit(current, key, row, column, next))} />;
  return <View style={styles.group}>
    <Text style={[type.bodySm, { color: colors.textSec }]}>Wrap words in {'{braces}'} to highlight them. Preview your copy before sharing.</Text>
    <Labels label="Eyebrow" value={slide.eyebrow ?? []} disabled={disabled} onChange={apply => change(current => ({ ...current, eyebrow: apply(current.eyebrow ?? []) }))} />
    {slide.kind === 'stat' && <>
      {slide.lines.map((line, row) => <View key={row} style={styles.group}>
        {cell(`Cover value ${row + 1}`, line[0], 'lines', row, 0)}
        {cell(`Cover label ${row + 1}`, line[1], 'lines', row, 1)}
      </View>)}
      {field('Cover description', slide.sub ?? '', 'sub')}
      <Labels label="Proof" value={slide.proof ?? []} disabled={disabled} onChange={apply => change(current => current.kind === 'stat' ? { ...current, proof: apply(current.proof ?? []) } : current)} />
    </>}
    {slide.kind === 'list' && <>
      {field('Benefits heading', slide.h, 'h')}
      {slide.cards.map((card, row) => <View key={row} style={styles.group}>
        {cell(`Benefit ${row + 1} title`, card[0], 'cards', row, 0)}
        {cell(`Benefit ${row + 1} description`, card[1], 'cards', row, 1)}
      </View>)}
      {field('Benefits description', slide.sub ?? '', 'sub')}
    </>}
    {slide.kind === 'steps' && <>
      {field('Steps heading', slide.h, 'h')}
      {slide.steps.map((step, row) => <View key={row} style={styles.group}>
        {(['number', 'title', 'description'] as const).map((label, column) => <View key={label}>
          {cell(`Step ${row + 1} ${label}`, step[column]!, 'steps', row, column)}
        </View>)}
      </View>)}
    </>}
    {slide.kind === 'quote' && <>
      {field('Testimonial', slide.quote, 'quote')}
      <Labels label="Attribution" value={slide.attrib} disabled={disabled} onChange={apply => change(current => current.kind === 'quote' ? { ...current, attrib: apply(current.attrib) } : current)} />
    </>}
    {slide.kind === 'cta' && <>
      {field('CTA heading', slide.h, 'h')}
      {field('CTA description', slide.sub ?? '', 'sub')}
      {field('CTA button', slide.btn, 'btn')}
      <Labels label="CTA footer" value={slide.foot ?? []} disabled={disabled} onChange={apply => change(current => current.kind === 'cta' ? { ...current, foot: apply(current.foot ?? []) } : current)} />
    </>}
    <SectionLabel>Photo</SectionLabel>
    <Choices disabled={disabled} options={[[ '', 'None' ], ...STUDIO_PHOTOS.map(id => [`/studio/photos/${id}.png`, id.replaceAll('-', ' ')] as [string, string])]} value={slide.photo?.src ?? ''}
      onChange={src => change(current => ({ ...current, photo: src ? { ...current.photo, src } : null }))} />
    {slide.photo && <>
      <SectionLabel>Photo position</SectionLabel>
      <Choices disabled={disabled} options={[[ 'center', 'Centre' ], [ 'center 28%', 'Upper centre' ], [ 'center 36%', 'Middle centre' ], [ 'right 20%', 'Upper right' ]]}
        value={slide.photo.pos ?? 'center'} onChange={pos => change(current => current.photo ? { ...current, photo: { ...current.photo, pos: pos as NonNullable<StudioSlide['photo']>['pos'] } } : current)} />
      <SectionLabel>Photo scrim</SectionLabel>
      <Choices disabled={disabled} options={[[ 'top', 'Top' ], [ 'left', 'Left' ], [ 'faint', 'Faint' ]]}
        value={slide.photo.scrim ?? 'top'} onChange={scrim => change(current => current.photo ? { ...current, photo: { ...current.photo, scrim: scrim as NonNullable<StudioSlide['photo']>['scrim'] } } : current)} />
    </>}
    <Labels label="Footer bar" value={slide.bar ?? []} disabled={disabled} onChange={apply => change(current => ({ ...current, bar: apply(current.bar ?? []) }))} />
  </View>;
}
const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.md }, field: { gap: spacing.sm },
  input: { minHeight: touch.minimum, borderWidth: 1, borderRadius: radius.control, padding: spacing.md,
    fontFamily: fonts.sans.regular, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
});
