/**
 * Captured Living: how the download-size picker words its options (fork-only).
 *
 * PicPeak builds the choices from Settings → Download resolutions: one entry
 * per configured size (label and box set by the admin, e.g. "Web & MLS" at
 * 2048 × 2048) plus "original" when full size is allowed. The design presents
 * the full-size option as the print file and recommends the first sized one,
 * which is what agents upload to the MLS. Used by
 * components/gallery/DownloadResolutionModal.tsx.
 */
import type { TFunction } from 'i18next';
import type { DownloadResolutionChoice } from '../types';

export interface ChoiceText {
  label: string;
  hint: string | null;
  recommended: boolean;
}

/** Display order: sized options first (largest first, as PicPeak sends them), full size last. */
export function orderChoices(choices: DownloadResolutionChoice[]): DownloadResolutionChoice[] {
  return [...choices.filter((c) => c.id !== 'original'), ...choices.filter((c) => c.id === 'original')];
}

/** The size preselected and marked "Recommended": the first non-original one. */
export function recommendedChoiceId(choices: DownloadResolutionChoice[]): string | undefined {
  return choices.find((c) => c.id !== 'original')?.id ?? choices[0]?.id;
}

export function describeChoice(
  choice: DownloadResolutionChoice,
  choices: DownloadResolutionChoice[],
  t: TFunction,
): ChoiceText {
  const recommended = choice.id === recommendedChoiceId(choices) && choice.id !== 'original';
  if (choice.id === 'original') {
    return {
      label: t('capturedLiving.download.printLabel', { defaultValue: 'Print · full resolution' }),
      hint: t('capturedLiving.download.printHint', {
        defaultValue: 'For brochures, flyers and signage. Larger files.',
      }),
      recommended: false,
    };
  }
  const size = choice.width && choice.height
    ? t('gallery.resolutionUpTo', 'up to {{width}} × {{height}} px', { width: choice.width, height: choice.height })
    : null;
  return {
    label: choice.label,
    hint: recommended
      ? t('capturedLiving.download.webHint', { defaultValue: 'Sized for listing uploads, websites and email' })
      : size,
    recommended,
  };
}
