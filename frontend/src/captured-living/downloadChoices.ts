/**
 * Captured Living: how the download-size picker words its options (fork-only).
 *
 * PicPeak builds the choices from Settings → Download resolutions: one entry
 * per configured size plus "original" when full size is allowed, and words
 * them itself (web / print / small hints). When a size is labelled for the MLS
 * (e.g. "Web & MLS" at 2048 × 2048), the design's listing wording takes over:
 * that size first, preselected and marked Recommended, and full size as the
 * print file. Without an MLS size everything stays PicPeak's. Used by
 * components/gallery/DownloadResolutionModal.tsx.
 */
import type { TFunction } from 'i18next';
import type { DownloadResolutionChoice } from '../types';

export interface ChoiceText {
  /** null = PicPeak's own label / hint. */
  label: string | null;
  hint: string | null;
  recommended: boolean;
}

const MLS_LABEL = /\bmls\b/i;

function mlsChoiceId(choices: DownloadResolutionChoice[]): string | undefined {
  return choices.find((c) => c.id !== 'original' && MLS_LABEL.test(c.label))?.id;
}

/** Display order: the MLS size first, the rest as PicPeak sends them. */
export function orderChoices(choices: DownloadResolutionChoice[]): DownloadResolutionChoice[] {
  const mls = mlsChoiceId(choices);
  if (!mls) return choices;
  return [...choices.filter((c) => c.id === mls), ...choices.filter((c) => c.id !== mls)];
}

/** The size to preselect: the MLS size when there is one, else PicPeak's first. */
export function recommendedChoiceId(choices: DownloadResolutionChoice[]): string | undefined {
  return mlsChoiceId(choices) ?? choices[0]?.id;
}

export function describeChoice(
  choice: DownloadResolutionChoice,
  choices: DownloadResolutionChoice[],
  t: TFunction,
): ChoiceText {
  const mls = mlsChoiceId(choices);
  if (!mls) return { label: null, hint: null, recommended: false };
  // The pixel size and download total stay PicPeak's own line below the hint.
  if (choice.id === 'original') {
    return {
      label: t('capturedLiving.download.printLabel', { defaultValue: 'Print · full resolution' }),
      hint: t('capturedLiving.download.printHint', {
        defaultValue: 'For brochures, flyers and signage. Larger files.',
      }),
      recommended: false,
    };
  }
  if (choice.id === mls) {
    return {
      label: null,
      hint: t('capturedLiving.download.webHint', { defaultValue: 'Sized for listing uploads, websites and email' }),
      recommended: true,
    };
  }
  return { label: null, hint: null, recommended: false };
}
