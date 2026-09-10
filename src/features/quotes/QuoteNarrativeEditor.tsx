import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { GhostButton } from '@/features/auth/ui';
import { Card, PillOption } from '@/features/trades/ui';
import { fonts, radius, spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import {
  convertBlock,
  inlineText,
  removeBlock,
  replaceBlock,
  replaceReportText,
  REPORT_ACCENTS,
  REPORT_MARKS,
  toggleReportMark,
  type ReportDoc,
  type ReportMark,
  type ReportRun,
  type ReportStyle,
  type TextRange,
} from './report-editor';

type Focus = { block: number; item: number | null; selection: TextRange };
/** Native structured text editing. The server owns sanitization and all rendered pricing. */
export function QuoteNarrativeEditor({
  doc,
  style,
  onDoc,
  onStyle,
  disabled,
}: {
  doc: ReportDoc;
  style: ReportStyle | null;
  onDoc: (doc: ReportDoc) => void;
  onStyle: (style: ReportStyle | null) => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState<Focus | null>(null);
  const [typingMarks, setTypingMarks] = useState<ReportMark[] | undefined>();
  const inputs = useRef(new Map<string, TextInput>());
  const selectedBlock = focus ? doc.blocks[focus.block] : null;
  const selectedRuns =
    selectedBlock?.type === 'bulletList'
      ? selectedBlock.items[focus?.item ?? 0]
      : selectedBlock && selectedBlock.type !== 'pricing'
        ? selectedBlock.content
        : null;
  function setRuns(blockIndex: number, item: number | null, runs: ReportRun[]) {
    const block = doc.blocks[blockIndex];
    if (!block || block.type === 'pricing') return;
    onDoc(
      replaceBlock(
        doc,
        blockIndex,
        block.type === 'bulletList'
          ? { ...block, items: block.items.map((line, index) => (index === item ? runs : line)) }
          : { ...block, content: runs },
      ),
    );
  }
  function mark(mark: ReportMark) {
    if (disabled || !focus || !selectedRuns) return;
    if (focus.selection.start === focus.selection.end)
      setTypingMarks(value =>
        value?.includes(mark) ? value.filter(item => item !== mark) : [...(value ?? []), mark],
      );
    else {
      setRuns(focus.block, focus.item, toggleReportMark(selectedRuns, focus.selection, mark));
      setTypingMarks(undefined);
    }
    inputs.current.get(`${focus.block}:${focus.item}`)?.focus();
  }
  const bodyStyle = [type.body, { color: colors.textPri }];
  function richText(runs: ReportRun[]) {
    return (
      <Text style={bodyStyle}>
        {runs.map((run, index) => (
          <Text
            key={index}
            style={{
              fontFamily: run.marks?.includes('bold') ? fonts.sans.bold : fonts.sans.regular,
              fontStyle: run.marks?.includes('italic') ? 'italic' : 'normal',
              textDecorationLine: run.marks?.includes('underline') ? 'underline' : 'none',
              backgroundColor: run.marks?.includes('highlight') ? colors.accentSoft : 'transparent',
            }}
          >
            {run.text}
          </Text>
        ))}
      </Text>
    );
  }
  function textField(blockIndex: number, item: number | null, runs: ReportRun[], label: string) {
    const key = `${blockIndex}:${item}`;
    const active = focus?.block === blockIndex && focus?.item === item;
    return (
      <View key={key} style={{ gap: spacing.sm }}>
        <Text style={[type.bodySm, { color: colors.textSec }]}>{label}</Text>
        {richText(runs)}
        <TextInput
          ref={input => {
            if (input) inputs.current.set(key, input);
            else inputs.current.delete(key);
          }}
          accessibilityLabel={label}
          value={inlineText(runs)}
          editable={!disabled}
          multiline
          onFocus={() => {
            if (!active) {
              setFocus({ block: blockIndex, item, selection: { start: 0, end: 0 } });
              setTypingMarks(undefined);
            }
          }}
          onSelectionChange={event => {
            setFocus({ block: blockIndex, item, selection: event.nativeEvent.selection });
          }}
          onChangeText={text =>
            setRuns(
              blockIndex,
              item,
              replaceReportText(runs, text, active ? typingMarks : undefined),
            )
          }
          style={[
            type.body,
            {
              color: colors.textPri,
              minHeight: 72,
              borderWidth: 1,
              borderColor: active ? colors.accentSoft : colors.ctlLine,
              borderRadius: radius.control,
              padding: spacing.md,
            },
          ]}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Text accessibilityRole="header" style={bodyStyle}>
          Text formatting
        </Text>
        <Text style={[type.bodySm, { color: colors.textSec }]}>
          Select text in a block, then choose formatting. Prices remain locked.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {REPORT_MARKS.map(value => (
            <GhostButton
              key={value}
              label={value}
              disabled={disabled || !focus}
              onPress={() => mark(value)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(['title', 'heading', 'paragraph', 'bulletList'] as const).map(value => (
            <GhostButton
              key={value}
              label={
                value === 'title'
                  ? 'Title H1'
                  : value === 'heading'
                    ? 'Heading H2'
                    : value === 'bulletList'
                      ? 'Bullets'
                      : 'Paragraph'
              }
              disabled={disabled || !focus || selectedBlock?.type === 'pricing'}
              onPress={() => {
                if (focus && selectedBlock && selectedBlock.type !== 'pricing') {
                  onDoc(replaceBlock(doc, focus.block, convertBlock(selectedBlock, value)));
                  setFocus({ ...focus, item: value === 'bulletList' ? 0 : null });
                }
              }}
            />
          ))}
        </View>
      </Card>
      {doc.blocks.map((block, index) =>
        block.type === 'pricing' ? (
          <Card key={index}>
            <Text accessibilityRole="header" style={bodyStyle}>
              Pricing · locked
            </Text>
            <Text style={[type.bodySm, { color: colors.textSec }]}>
              The customer document uses the saved server prices. Edit prices in the separate Prices
              view.
            </Text>
          </Card>
        ) : (
          <Card key={index}>
            {block.type === 'bulletList' ? (
              <>
                {block.items.map((line, item) =>
                  textField(index, item, line, `Block ${index + 1}, bullet ${item + 1}`),
                )}
                <GhostButton
                  label={`Add bullet to block ${index + 1}`}
                  disabled={disabled}
                  onPress={() =>
                    onDoc(replaceBlock(doc, index, { ...block, items: [...block.items, []] }))
                  }
                />
              </>
            ) : (
              textField(index, null, block.content, `Block ${index + 1}, ${block.type}`)
            )}
            <GhostButton
              label={`Remove text block ${index + 1}`}
              disabled={disabled}
              onPress={() => {
                onDoc(removeBlock(doc, index));
                setFocus(null);
              }}
            />
          </Card>
        ),
      )}
      <GhostButton
        label="Add text block"
        disabled={disabled || doc.blocks.length >= 300}
        onPress={() => {
          const blocks = [...doc.blocks];
          blocks.splice(
            focus
              ? focus.block + 1
              : Math.max(
                  0,
                  blocks.findIndex(block => block.type === 'pricing'),
                ),
            0,
            { type: 'paragraph', content: [] },
          );
          onDoc({ version: 1, blocks });
          setFocus(null);
        }}
      />
      <Card>
        <Text accessibilityRole="header" style={bodyStyle}>
          Document appearance
        </Text>
        <Text style={[type.bodySm, { color: colors.textSec }]}>
          These choices apply to this quote after you save the document.
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Document font"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
        >
          {(['system', 'serif', 'sans', 'mono'] as const).map(value => (
            <PillOption
              key={value}
              label={value}
              selected={style?.fontFamily === value}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onStyle({ ...style, fontFamily: value });
              }}
            />
          ))}
        </View>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Document accent"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
        >
          {REPORT_ACCENTS.map((value, index) => (
            <PillOption
              key={value}
              label={['Orange', 'Charcoal', 'Blue', 'Green', 'Purple'][index]!}
              selected={style?.accentColor === value}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onStyle({ ...style, accentColor: value });
              }}
            />
          ))}
        </View>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Heading decoration"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
        >
          {(['plain', 'underline', 'bar'] as const).map(value => (
            <PillOption
              key={value}
              label={value}
              selected={style?.headingStyle === value}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onStyle({ ...style, headingStyle: value });
              }}
            />
          ))}
        </View>
        <GhostButton
          label="Use business document appearance"
          disabled={disabled}
          onPress={() => onStyle(null)}
        />
      </Card>
    </View>
  );
}
