import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { LEGAL_DOCS } from "@/legalContent";
import MaskedTitle from "@/components/MaskedTitle";

function Block({ b }) {
  if (b.type === "h2") {
    return <h2 className="mt-12 text-base font-extrabold tracking-tight uppercase sm:text-lg">{b.text}</h2>;
  }
  if (b.type === "h3") {
    return <h3 className="mt-8 text-sm font-bold tracking-wide uppercase">{b.text}</h3>;
  }
  if (b.type === "li") {
    return (
      <div className="flex gap-3 text-sm leading-relaxed text-zinc-600">
        <span className="mt-[8px] h-1.5 w-1.5 shrink-0 bg-[#FFE600]" />
        <span>{b.text}</span>
      </div>
    );
  }
  if (b.type === "table") {
    return (
      <div className="mt-4 overflow-x-auto border border-zinc-200">
        <table className="w-full text-left">
          <thead>
            <tr>
              {b.rows[0].map((c, i) => (
                <th key={i} className="border-b border-zinc-200 bg-[#E8E8E8] px-3 py-2.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.slice(1).map((row, i) => (
              <tr key={i} className="border-b border-zinc-100 last:border-0">
                {row.map((c, j) => (
                  <td key={j} className="px-3 py-2.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p className="text-sm leading-relaxed text-zinc-600">{b.text}</p>;
}

export default function LegalPage() {
  const { slug } = useParams();
  const doc = LEGAL_DOCS[slug];

  if (!doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 pt-16" data-testid="legal-not-found">
        <p className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-5xl">404</p>
        <Link to="/" className="mt-4 border-b-2 border-black pb-1 font-mono text-xs font-bold tracking-[0.2em] hover:border-[#FFE600]">
          HOME
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-28 pb-24 sm:px-8 sm:pt-32" data-testid={`legal-page-${slug}`}>
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          data-testid="legal-back-link"
          className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em] text-zinc-500 transition-colors hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          HOME
        </Link>
        <MaskedTitle
          testid="legal-title"
          className="font-display text-3xl leading-[1.02] font-extrabold tracking-tight uppercase sm:text-5xl"
        >
          {doc.title}
        </MaskedTitle>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 space-y-3.5"
          data-testid="legal-content"
        >
          {doc.content.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
