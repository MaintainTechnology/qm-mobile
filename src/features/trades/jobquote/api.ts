/**
 * Job quoter data layer (spec web-parity F2). The catalogue query lives in
 * ../catalogue-api (shared with the hub's Catalogue section).
 */
import { useAuth } from '@clerk/expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';
import { z } from 'zod';

import { appendUploadFiles, type PickedFile, type UploadPolicy } from '@/lib/media';

import { JobQuoteOperationSchema, type JobQuoteRequest, type JobQuoteOperation } from './schema';

export function useJobQuote() {
  const currentToken = useCurrentJobToken();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (body: JobQuoteRequest): Promise<JobQuoteOperation> =>
      apiRequest('/api/tenant/job-quote', JobQuoteOperationSchema, {
        method: 'POST',
        body,
        token: await currentToken(),
        timeoutMs: 90000,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: TENANT_ME_KEY });
    },
  });
}

export function useJobQuoteStatus() {
  const currentToken = useCurrentJobToken();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (operationId: string) => {
      const id = z.string().uuid().parse(operationId);
      return apiRequest(`/api/tenant/job-quote/operations/${id}`, JobQuoteOperationSchema, {
        token: await currentToken(),
        timeoutMs: 15000,
      });
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: TENANT_ME_KEY });
    },
  });
}

/** Prevent a token fetch crossing an account/session change from dispatching old input. */
function useCurrentJobToken() {
  const { getToken, userId, sessionId } = useAuth();
  const identity = useRef({ userId, sessionId, active: true });
  identity.current.userId = userId;
  identity.current.sessionId = sessionId;
  useEffect(() => {
    const current = identity.current;
    current.active = true;
    return () => {
      current.active = false;
    };
  }, []);
  return async () => {
    const started = { ...identity.current };
    if (!started.active || !started.userId) throw new MissingClerkTokenError();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const token = requireClerkToken(
        await Promise.race([
          getToken(),
          new Promise<null>(resolve => {
            timer = setTimeout(() => resolve(null), 5000);
          }),
        ]),
      );
      const current = identity.current;
      if (
        !current.active ||
        started.userId !== current.userId ||
        started.sessionId !== current.sessionId
      ) {
        throw new MissingClerkTokenError();
      }
      return token;
    } finally {
      clearTimeout(timer);
    }
  };
}

export const JOB_PHOTO_POLICY = {
  purpose: 'job photo',
  field: 'photos',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedTypeLabel: 'JPEG, PNG or WebP',
  maxBytes: 8 * 1024 * 1024,
  maxFiles: 3,
} as const satisfies UploadPolicy;

/** Upload one at a time: the server's partial batch response has no file indices. */
export const JobPhotoResponseSchema = z.object({
  ok: z.literal(true),
  count: z.literal(1),
  paths: z.array(z.string().trim().min(1)).length(1),
  urls: z.array(z.string().url()).length(1),
});

export function jobPhotoForm(file: PickedFile): FormData {
  const form = new FormData();
  const result = appendUploadFiles(form, JOB_PHOTO_POLICY, [file]);
  if (!result.ok) throw new Error(result.problem.message);
  return form;
}

export function useJobPhotoUpload() {
  const currentToken = useCurrentJobToken();
  return useMutation({
    mutationFn: async ({ form, signal }: { form: FormData; signal: AbortSignal }) => {
      // Cancellation also covers the response-body read in apiRequest.
      return apiRequest('/api/tenant/job-quote/photos', JobPhotoResponseSchema, {
        method: 'POST',
        body: form,
        token: await currentToken(),
        signal,
        timeoutMs: 60000,
      });
    },
  });
}

export const AddressSuggestionsSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    suggestions: z.array(
      z.object({
        id: z.string(),
        address: z.string(),
        state: z.string().nullable(),
        postcode: z.string().nullable(),
      }),
    ),
  }),
  z.looseObject({ ok: z.literal(false) }),
]);
export type AddressSuggestion = Extract<
  z.infer<typeof AddressSuggestionsSchema>,
  { ok: true }
>['suggestions'][number];

export function useAddressSuggestions() {
  return useApiMutation<{ query: string }, z.infer<typeof AddressSuggestionsSchema>>(
    '/api/roofing/suggest-address',
    AddressSuggestionsSchema,
  );
}
