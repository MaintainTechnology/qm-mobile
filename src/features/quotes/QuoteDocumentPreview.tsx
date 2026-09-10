import { useAuth } from '@clerk/expo';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { GhostButton } from '@/features/auth/ui';
import { Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { downloadAndShare } from '@/lib/download';
import { apiUrl } from '@/lib/env';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { loadOwnerQuoteHtml } from './quote-document';

/** Render only the customer document. Owner review data and controls remain outside the renderer. */
export function QuoteDocumentPreview({
  token,
  revision,
  quoteId,
}: {
  token: string;
  revision: string;
  quoteId: string;
}) {
  const { colors } = useTheme();
  const { getToken, userId, sessionId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [shareFailure, setShareFailure] = useState<string | null>(null);
  const identity = `${userId}:${sessionId}:${quoteId}:${token}:${revision}`;
  const current = useRef({ userId, sessionId, identity, active: true });
  current.current.userId = userId;
  current.current.sessionId = sessionId;
  current.current.identity = identity;
  const transfer = useRef<AbortController | null>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    const lifecycle = current.current;
    lifecycle.active = true;
    setFailure(null);
    setLoading(true);
    setShareFailure(null);
    setSharing(false);
    return () => {
      lifecycle.active = false;
      transfer.current?.abort();
      clearTimeout(renderTimer.current);
    };
  }, [identity]);

  useEffect(() => {
    const controller = new AbortController();
    setHtml(null);
    setFailure(null);
    setLoading(true);
    void loadOwnerQuoteHtml(token, () => getTokenRef.current(), controller.signal)
      .then(document => {
        if (controller.signal.aborted) return;
        setHtml(document);
        setLoading(false);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setFailure(apiErrorMessage(error, 'The saved document could not be loaded.'));
        }
      });
    return () => controller.abort();
  }, [identity, token, reload]);

  async function sharePdf() {
    if (transfer.current || !userId) return;
    const started = { ...current.current };
    const controller = new AbortController();
    transfer.current = controller;
    setSharing(true);
    setShareFailure(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const bearer = requireClerkToken(
        await Promise.race([
          getToken(),
          new Promise<null>(resolve => {
            timer = setTimeout(() => resolve(null), 5000);
          }),
        ]),
      );
      clearTimeout(timer);
      timer = undefined;
      if (
        !current.current.active ||
        current.current.userId !== started.userId ||
        current.current.sessionId !== started.sessionId ||
        current.current.identity !== started.identity ||
        controller.signal.aborted
      )
        throw new MissingClerkTokenError();
      if (Platform.OS === 'web') {
        await Linking.openURL(apiUrl(`/api/q/${encodeURIComponent(token)}/pdf`));
      } else
        await downloadAndShare({
          path: `/api/q/${encodeURIComponent(token)}/pdf`,
          filename: `QuoteMax-${quoteId}.pdf`,
          mimeType: 'application/pdf',
          token: bearer,
          signal: controller.signal,
          timeoutMs: 90000,
        });
    } catch (error) {
      if (
        current.current.active &&
        current.current.identity === started.identity &&
        !controller.signal.aborted
      )
        setShareFailure(apiErrorMessage(error, 'The PDF could not be opened. Try again.'));
    } finally {
      clearTimeout(timer);
      if (transfer.current === controller) transfer.current = null;
      if (current.current.active && current.current.identity === started.identity)
        setSharing(false);
    }
  }

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text style={[type.bodySm, { color: colors.textDim }]}>
          Saved customer document · changes appear after Save
        </Text>
        <GhostButton
          label={sharing ? 'Preparing PDF…' : 'Download or share PDF'}
          onPress={() => void sharePdf()}
          disabled={sharing || !userId}
        />
        {sharing ? (
          <GhostButton label="Cancel download" onPress={() => transfer.current?.abort()} />
        ) : null}
        {shareFailure ? <Notice tone="warn" label="PDF unavailable" body={shareFailure} /> : null}
      </View>
      {failure ? (
        <Notice
          tone="warn"
          label="Document preview could not load"
          body={failure}
          onRetry={() => {
            setFailure(null);
            setLoading(true);
            setReload(old => old + 1);
          }}
        />
      ) : !html ? (
        <ActivityIndicator
          accessibilityLabel="Loading owned customer document"
          color={colors.accent}
        />
      ) : Platform.OS === 'web' ? (
        <iframe
          key={identity}
          title="Saved customer quote"
          srcDoc={html}
          sandbox=""
          referrerPolicy="no-referrer"
          style={{ flex: 1, width: '100%', minHeight: 360, border: 0 }}
        />
      ) : (
        <View style={{ flex: 1, minHeight: 360 }}>
          {loading ? (
            <ActivityIndicator accessibilityLabel="Loading saved document" color={colors.accent} />
          ) : null}
          <WebView
            key={`${userId}:${quoteId}:${revision}:${reload}`}
            source={{ html, baseUrl: 'about:blank' }}
            originWhitelist={['*']}
            javaScriptEnabled={false}
            domStorageEnabled={false}
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            incognito
            allowFileAccess={false}
            allowUniversalAccessFromFileURLs={false}
            mixedContentMode="never"
            onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
            onLoadStart={() => {
              setLoading(true);
              clearTimeout(renderTimer.current);
              renderTimer.current = setTimeout(() => {
                setLoading(false);
                setFailure('The preview timed out. The PDF remains available.');
              }, 30000);
            }}
            onLoadEnd={() => {
              clearTimeout(renderTimer.current);
              setLoading(false);
            }}
            onError={() => {
              clearTimeout(renderTimer.current);
              setFailure('Check your connection and reload the saved document.');
            }}
            onHttpError={() => {
              clearTimeout(renderTimer.current);
              setFailure(
                'The saved document is unavailable or its link has expired. Refresh the quote.',
              );
            }}
            onContentProcessDidTerminate={() =>
              setFailure('The document renderer stopped. Reload the preview.')
            }
            onRenderProcessGone={() =>
              setFailure('The document renderer stopped. Reload the preview.')
            }
          />
        </View>
      )}
    </View>
  );
}
