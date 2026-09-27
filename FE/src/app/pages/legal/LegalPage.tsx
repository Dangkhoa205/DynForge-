import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';

/** Contact address shown on every legal page. Keep in sync with PLAYSTORE.md. */
export const SUPPORT_EMAIL = 'dynforge.edu.hcmcity@gmail.com';

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
}

/** Shared shell for /privacy, /terms and /delete-account: plain, readable, works on phones. */
export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
  const { lang } = useLanguage();
  return (
    <div className="bg-[#020B18] min-h-screen text-slate-200">
      <div className="mx-auto max-w-3xl px-5 pt-24 pb-16 sm:pt-28">
        <h1
          className="text-4xl sm:text-5xl text-white font-normal leading-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {lang === 'vi' ? 'Cập nhật lần cuối: ' : 'Last updated: '}
          {updated}
        </p>

        {intro && <div className="mt-6 text-sm leading-relaxed text-slate-300 space-y-3">{intro}</div>}

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold text-white">
                {i + 1}. {s.heading}
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-slate-300 space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-cyan-300 [&_a]:underline">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-sm">
          <Link to="/privacy" className="text-cyan-300 hover:text-cyan-200">
            {lang === 'vi' ? 'Chính sách bảo mật' : 'Privacy Policy'}
          </Link>
          <Link to="/terms" className="text-cyan-300 hover:text-cyan-200">
            {lang === 'vi' ? 'Điều khoản sử dụng' : 'Terms of Use'}
          </Link>
          <Link to="/delete-account" className="text-cyan-300 hover:text-cyan-200">
            {lang === 'vi' ? 'Xoá tài khoản' : 'Delete account'}
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200">
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </div>
    </div>
  );
}
