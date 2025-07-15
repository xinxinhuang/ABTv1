'use client';

import { ReactNode } from 'react';

interface GameLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function GameLayout({
  children,
  title,
  subtitle,
  actions,
  className = '',
  containerClassName = ''
}: GameLayoutProps) {
  return (
    <div className={`content-height ${className}`}>
      <div className={`container-game py-6 ${containerClassName}`}>
        {(title || subtitle || actions) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-lg text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// Variant for centered content (like auth pages)
export function CenteredLayout({
  children,
  title,
  subtitle,
  className = '',
  maxWidth = 'max-w-md'
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`content-height flex items-center justify-center ${className}`}>
      <div className={`w-full ${maxWidth} px-4`}>
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// Variant for dashboard-like layouts
export function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
  sidebar,
  className = ''
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`content-height ${className}`}>
      <div className="container-game py-6">
        {(title || subtitle || actions) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-lg text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-6">
          {sidebar && (
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="game-card p-4">
                {sidebar}
              </div>
            </aside>
          )}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// Variant for battle/arena layouts
export function BattleLayout({
  children,
  title,
  subtitle,
  playerInfo,
  opponentInfo,
  actions,
  className = ''
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  playerInfo?: ReactNode;
  opponentInfo?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`content-height ${className}`}>
      <div className="container-game py-6">
        {/* Battle Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-lg text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
          
          {/* Player vs Opponent Info */}
          {(playerInfo || opponentInfo) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {playerInfo && (
                <div className="game-card p-4">
                  <h3 className="font-semibold text-primary mb-2">You</h3>
                  {playerInfo}
                </div>
              )}
              {opponentInfo && (
                <div className="game-card p-4">
                  <h3 className="font-semibold text-secondary mb-2">Opponent</h3>
                  {opponentInfo}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Battle Content */}
        {children}
      </div>
    </div>
  );
}

// Simple card wrapper for consistent card styling
export function Card({
  children,
  className = '',
  padding = 'p-6',
  hover = true
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  hover?: boolean;
}) {
  return (
    <div className={`game-card ${padding} ${hover ? 'hover:shadow-lg' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Grid layout for cards/items
export function GridLayout({
  children,
  columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-6',
  className = ''
}: {
  children: ReactNode;
  columns?: string;
  gap?: string;
  className?: string;
}) {
  return (
    <div className={`grid ${columns} ${gap} ${className}`}>
      {children}
    </div>
  );
} 