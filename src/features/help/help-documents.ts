/** Complete census of static HTML/PDF/CSV files in the audited website public folder. */
export type HelpDocument = {
  path: string;
  title: string;
  format: 'html' | 'pdf' | 'csv';
  audience: 'tradie' | 'gated';
  historical?: boolean;
};

export const HELP_DOCUMENTS: readonly HelpDocument[] = [
  {
    path: '/sms-ai-receptionist-workflow%201.html',
    title: 'SMS AI receptionist pipeline (legacy copy)',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/agent-architecture.html',
    title: 'Voice and SMS agent architecture',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/architecture.html',
    title: 'Platform architecture · stages 01–10',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/beginner-walkthrough.html',
    title: 'Beginner walkthrough · stages 01–05',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/beginner-walkthrough.pdf',
    title: 'Beginner walkthrough · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/build-guide.html',
    title: 'Automation build guide',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/commercial-paint-kb-supplement.html',
    title: 'Commercial paint knowledge-base supplement',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/dashboard-capabilities.html',
    title: 'Dashboard capabilities investor brief',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/database-architecture.html',
    title: 'Database architecture and wiring map',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/database-visual.html',
    title: 'How QuoteMax data flows',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/estimating-recipes-guide.html',
    title: 'Recipes and estimating beginner guide',
    format: 'html',
    audience: 'tradie',
  },
  {
    path: '/docs/estimator-filestore-supplement.html',
    title: 'Estimator file-store supplement',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/ig-engine-flow.html',
    title: 'How the AI picture is made',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/investor-pack/agents.html',
    title: 'Investor pack · AI agents',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/investor-pack/architecture.html',
    title: 'Investor pack · system architecture',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/investor-pack/demo-script.html',
    title: 'Investor pack · live demo script',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/investor-pack/index.html',
    title: 'Investor overview',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/kb-verify-explainer.html',
    title: 'Pricing knowledge-base verification',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/onboarding-bundle.html',
    title: 'Trade onboarding bundle specification',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/paint-estimator-explained.html',
    title: 'How the paint estimator prices a job',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/platform-capabilities-walkthrough.html',
    title: 'Platform walkthrough',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/platform-capabilities-walkthrough.pdf',
    title: 'Platform walkthrough · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/pricing-data-accuracy.html',
    title: 'How accurate is the price book?',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/pricing-flow.html',
    title: 'How the receptionist prices a job',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/pricing-transparency.html',
    title: 'How pricing works',
    format: 'html',
    audience: 'tradie',
  },
  {
    path: '/docs/pricing-transparency.pdf',
    title: 'How pricing works · PDF',
    format: 'pdf',
    audience: 'tradie',
  },
  {
    path: '/docs/quote-engine-explainer.html',
    title: 'Intake and estimation engine',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/quote-engine-explainer.pdf',
    title: 'Intake and estimation engine · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/quoteMate-au-progress.html',
    title: 'QuoteMax build status',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/quotemate-feature-overview.html',
    title: 'QuoteMax feature overview',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/quotemate-feature-overview.pdf',
    title: 'QuoteMax feature overview · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/quotemax-onepager.html',
    title: 'QuoteMax how-it-works one-pager',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/quotemax-onepager.pdf',
    title: 'QuoteMax how-it-works one-pager · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  { path: '/docs/red-team-brief.html', title: 'Red-team brief', format: 'html', audience: 'gated' },
  {
    path: '/docs/sms-ai-receptionist-workflow.html',
    title: 'SMS AI receptionist pipeline',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/sms-before-after.html',
    title: 'SMS receptionist · before and after',
    format: 'html',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/sms-before-after.pdf',
    title: 'SMS receptionist · before and after · PDF',
    format: 'pdf',
    audience: 'tradie',
    historical: true,
  },
  {
    path: '/docs/sms-onboarding-architecture.html',
    title: 'SMS onboarding architecture',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/sms-onboarding-flow.html',
    title: 'SMS onboarding flow',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/sms-progress.html',
    title: 'SMS weekly progress',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/sms-sop.html',
    title: 'SMS channel build guide',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/stage1-05-sop.html',
    title: 'Stage 01–05 walkthrough',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/stage6-10-sop.html',
    title: 'Stage 06–10 walkthrough',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/supplier-catalogue-template.csv',
    title: 'Supplier catalogue import template',
    format: 'csv',
    audience: 'tradie',
  },
  {
    path: '/docs/trade-book-pipeline-spike.html',
    title: 'Trade-book pipeline spike',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/tradie-onboarding-architecture.html',
    title: 'Tradie onboarding architecture',
    format: 'html',
    audience: 'gated',
  },
  {
    path: '/docs/tradie-onboarding-plan-sms.html',
    title: 'Tradie onboarding via SMS',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/tradie-onboarding-plan.html',
    title: 'Tradie onboarding plan',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
  {
    path: '/docs/wireframe.html',
    title: 'Architecture wireframe',
    format: 'html',
    audience: 'gated',
    historical: true,
  },
] as const;

const APPROVED_HELP_PATHS = new Set(HELP_DOCUMENTS.map(document => document.path));

export function isApprovedHelpDocumentPath(path: string): boolean {
  return APPROVED_HELP_PATHS.has(path) && !path.includes('?') && !path.includes('#');
}

export function helpDocumentMime(document: HelpDocument): string {
  if (document.format === 'pdf') return 'application/pdf';
  if (document.format === 'csv') return 'text/csv';
  return 'text/html';
}

export function helpDocumentFilename(document: HelpDocument): string {
  const basename = document.path.split('/').at(-1) ?? `quotemax-help.${document.format}`;
  return decodeURIComponent(basename);
}

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-AU');
}

export function filterHelpDocuments(
  documents: readonly HelpDocument[],
  rawQuery: string,
): HelpDocument[] {
  const terms = searchable(rawQuery.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...documents];
  return documents.filter(document => {
    const haystack = searchable(
      `${document.title} ${document.path} ${document.format} ${document.historical ? 'historical' : 'current'}`,
    );
    return terms.every(term => haystack.includes(term));
  });
}
