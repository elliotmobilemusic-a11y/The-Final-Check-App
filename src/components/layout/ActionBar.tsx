import { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'between' | 'center';
  sticky?: boolean;
}

export function ActionBar({ children, className = '', align = 'end', sticky = false }: ActionBarProps) {
  const alignClasses = {
    start: 'justify-start',
    end: 'justify-end',
    between: 'justify-between',
    center: 'justify-center'
  };

  return (
    <div className={`action-bar flex flex-wrap items-center gap-3 ${alignClasses[align]} ${sticky ? 'sticky bottom-0 bg-panel border-t border-line py-4 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 z-40' : ''} ${className}`}>
      {children}
    </div>
  );
}