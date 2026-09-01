import React from 'react';
import { ChevronLeft, ArrowLeft } from 'lucide-react';
import { useNavigation, MainTabType } from '../context/NavigationContext';

interface BackButtonProps {
  label?: string;
  fallbackTab?: MainTabType;
  onClick?: () => void;
  variant?: 'default' | 'pill' | 'subtle' | 'compact' | 'admin' | 'dark';
  showPreviousTitle?: boolean;
  className?: string;
  iconOnly?: boolean;
  title?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label,
  fallbackTab,
  onClick,
  variant = 'default',
  showPreviousTitle = true,
  className = '',
  iconOnly = false,
  title
}) => {
  const { goBack, previousState, canGoBack, navigateTo } = useNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick();
      return;
    }

    if (canGoBack) {
      goBack();
    } else if (fallbackTab) {
      navigateTo(fallbackTab);
    } else {
      goBack();
    }
  };

  // Determine display label
  let displayLabel = label;
  if (!displayLabel) {
    if (showPreviousTitle && previousState?.title) {
      displayLabel = `Back to ${previousState.title}`;
    } else {
      displayLabel = 'Back';
    }
  }

  const tooltipTitle = title || (previousState?.title ? `Go back to ${previousState.title}` : 'Go back to previous screen');

  if (variant === 'admin') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltipTitle}
        aria-label={tooltipTitle}
        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 transition-all shadow-sm cursor-pointer ${className}`}
      >
        <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
        {!iconOnly && <span>{displayLabel}</span>}
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltipTitle}
        aria-label={tooltipTitle}
        className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[#002b49] dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition-all shadow-sm cursor-pointer ${className}`}
      >
        <ChevronLeft className="w-4 h-4 text-[#00a3e0] group-hover:-translate-x-0.5 transition-transform" />
        {!iconOnly && <span>{displayLabel}</span>}
      </button>
    );
  }

  if (variant === 'subtle') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltipTitle}
        aria-label={tooltipTitle}
        className={`group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#002b49] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 ${className}`}
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#00a3e0]" />
        {!iconOnly && <span>{displayLabel}</span>}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltipTitle}
        aria-label={tooltipTitle}
        className={`group p-1.5 rounded-xl text-slate-600 hover:text-[#002b49] dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer ${className}`}
      >
        <ChevronLeft className="w-4 h-4 text-[#00a3e0] group-hover:-translate-x-0.5 transition-transform" />
      </button>
    );
  }

  if (variant === 'dark') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltipTitle}
        aria-label={tooltipTitle}
        className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all shadow-md cursor-pointer ${className}`}
      >
        <ChevronLeft className="w-4 h-4 text-[#00a3e0] group-hover:-translate-x-0.5 transition-transform" />
        {!iconOnly && <span>{displayLabel}</span>}
      </button>
    );
  }

  // Default variant
  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltipTitle}
      aria-label={tooltipTitle}
      className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-[#002b49] dark:text-white border border-slate-200 dark:border-slate-800 hover:border-[#00a3e0]/40 transition-all shadow-sm cursor-pointer ${className}`}
    >
      <ChevronLeft className="w-4 h-4 text-[#00a3e0] group-hover:-translate-x-0.5 transition-transform" />
      {!iconOnly && <span>{displayLabel}</span>}
    </button>
  );
};
