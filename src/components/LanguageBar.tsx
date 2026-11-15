import React from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lang } from '../types';

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'sd', label: 'سنڌي' },
];

export function LanguageBar({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useAuth();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 ${
        compact ? 'w-full justify-between' : ''
      }`}
      role="group"
      aria-label="Language selection"
    >
      <span className="px-2 text-slate-500" aria-hidden="true">
        <Globe className="h-3.5 w-3.5" />
      </span>
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLang(opt.code)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            lang === opt.code
              ? 'bg-white text-[#0B1F3A] shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-[#0B1F3A]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
