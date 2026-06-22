'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function CopyButton({
                                       text,
                                       className = '',
                                       title = 'Copy to clipboard',
                                   }: {
    text: string;
    className?: string;
    title?: string;
}) {
  const { t } = useTranslation();
    const [done, setDone] = useState(false);

    const copy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1200);
        } catch {

            window.prompt('Copy this value:', text);
        }
    }, [text]);

    return (
        <button
            type="button"
            onClick={copy}
            title={title}
            className={`inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs shadow hover:bg-white/30 transition ${className}`}
        >
            <span role="img" aria-label="copy">{done ? '✅' : '📋'}</span>
            {done ? 'Copied' : 'Copy'}
        </button>
    );
}
