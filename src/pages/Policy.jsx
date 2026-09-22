import { Link, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import NotFound from './NotFound';
import { POLICIES, POLICY_LIST, BUSINESS } from '../content/policies';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

/**
 * One component for all three store policies (/policies/refund|terms|privacy).
 * Content lives in src/content/policies.js so wording changes never touch JSX.
 */
export default function Policy() {
  const { policy: key } = useParams();
  const policy = POLICIES[key];

  useDocumentMeta({
    title: policy?.title,
    description: policy?.description,
    path: policy ? `/policies/${policy.slug}` : undefined,
    noindex: !policy,
  });

  if (!policy) return <NotFound />;

  return (
    <main className="min-h-screen bg-neutral-white">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-8">
        {/* Switch between the three policies */}
        <nav aria-label="Store policies" className="flex flex-wrap gap-2 mb-10">
          {POLICY_LIST.map((p) => {
            const active = p.slug === policy.slug;
            return (
              <Link
                key={p.slug}
                to={`/policies/${p.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`text-xs font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-minimal border transition-colors duration-200 ${
                  active
                    ? 'bg-text-dark text-white border-text-dark'
                    : 'border-neutral-light-beige text-text-medium hover:border-text-dark hover:text-text-dark'
                }`}
              >
                {p.shortTitle}
              </Link>
            );
          })}
        </nav>

        <h1 className="text-3xl md:text-5xl font-extrabold text-text-dark uppercase tracking-wide leading-[1.05] mb-4">
          {policy.title}
        </h1>
        <p className="text-xs uppercase tracking-[0.15em] text-text-light mb-8">
          Last updated {BUSINESS.lastUpdated}
        </p>
        <p className="text-base md:text-lg text-text-medium leading-relaxed mb-12">
          {policy.intro}
        </p>

        <div className="space-y-10">
          {policy.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-sm md:text-base font-bold text-text-dark uppercase tracking-[0.12em] mb-3">
                {s.heading}
              </h2>
              {s.body?.map((t, i) => (
                <p key={i} className="text-text-medium leading-relaxed mb-3">{t}</p>
              ))}
              {s.list && (
                <ul className="list-disc pl-5 space-y-2 text-text-medium leading-relaxed mb-3 marker:text-accent-brown">
                  {s.list.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {s.after?.map((t, i) => (
                <p key={i} className="text-text-medium leading-relaxed mb-3">{t}</p>
              ))}
              {s.link && (
                <Link
                  to={s.link.to}
                  className="inline-block text-sm font-bold text-accent-brown underline underline-offset-4 hover:text-text-dark"
                >
                  {s.link.label} →
                </Link>
              )}
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </main>
  );
}
