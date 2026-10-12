/**
 * Captured Living: the top of the customer dashboard (fork-only file).
 *
 * A welcome line, a "book your next shoot" link and a highlight card for the
 * newest delivered gallery, as in the "Agent portal overview" design. It sits
 * above PicPeak's own dashboard sections, which stay as they are; the single
 * mount point is in pages/customer/CustomerDashboardPage.tsx. Styling lives in
 * styles/captured-living.css (.cl-dash-*).
 *
 * Texts carry English defaults (defaultValue) rather than entries in
 * PicPeak's locale files; add capturedLiving.dashboard.* to a locale file
 * to translate them.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { CustomerEvent } from '../services/customer.service';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { useLocalizedDate } from '../hooks/useLocalizedDate';

interface DashboardIntroProps {
  events: CustomerEvent[];
  onOpen: (slug: string) => void;
  openingSlug: string | null;
}

const newestFirst = (a: CustomerEvent, b: CustomerEvent) =>
  (b.eventDate || b.assignedAt || '').localeCompare(a.eventDate || a.assignedAt || '');

export const DashboardIntro: React.FC<DashboardIntroProps> = ({ events, onOpen, openingSlug }) => {
  const { t } = useTranslation();
  const { data: settings } = usePublicSettings();
  const { format } = useLocalizedDate();

  // Handed down by CustomerLayout's <Outlet context>; absent outside the portal.
  const name = useOutletContext<{ clFirstName?: string } | undefined>()?.clFirstName || '';
  const supportEmail = settings?.branding_support_email?.trim();
  const latest = events.filter((e) => e.availability === 'active').sort(newestFirst)[0];
  // Same localized format the dashboard list uses below.
  let latestDate: string | null = null;
  try { latestDate = latest?.eventDate ? format(latest.eventDate) : null; } catch { latestDate = null; }

  return (
    <div className="cl-dash-intro">
      <div className="cl-dash-welcome">
        <div>
          <h1 className="cl-dash-title">
            {name
              ? t('capturedLiving.dashboard.welcomeName', { defaultValue: 'Welcome back, {{name}}', name })
              : t('capturedLiving.dashboard.welcome', { defaultValue: 'Welcome back' })}
          </h1>
          <p className="cl-dash-subtitle">
            {t('capturedLiving.dashboard.subtitle', { defaultValue: 'Here is where every listing stands.' })}
          </p>
        </div>
        {supportEmail && (
          <a className="cl-dash-cta" href={`mailto:${supportEmail}`}>
            {t('capturedLiving.dashboard.book', { defaultValue: 'Book your next shoot' })}
          </a>
        )}
      </div>

      {latest && (
        <section className="cl-dash-latest" aria-labelledby="cl-dash-latest-title">
          <div>
            <div className="cl-dash-eyebrow">
              {t('capturedLiving.dashboard.latest', { defaultValue: 'Ready to download' })}
            </div>
            <h2 id="cl-dash-latest-title" className="cl-dash-latest-title">{latest.eventName}</h2>
            {latestDate && <div className="cl-dash-latest-meta">{latestDate}</div>}
          </div>
          <button
            type="button"
            className="cl-dash-latest-open"
            onClick={() => onOpen(latest.slug)}
            disabled={openingSlug !== null}
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            {openingSlug === latest.slug
              ? t('customer.dashboard.opening', 'Opening…')
              : t('capturedLiving.dashboard.openGallery', { defaultValue: 'Open gallery' })}
          </button>
        </section>
      )}
    </div>
  );
};
