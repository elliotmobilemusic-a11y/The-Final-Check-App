import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'wide' | 'narrow' | 'full';
}

export function PageContainer({ children, className = '', size = 'default' }: PageContainerProps) {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-none'
  };

  return (
    <div className={`page-container ${sizeClasses[size]} mx-auto px-4 md:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}