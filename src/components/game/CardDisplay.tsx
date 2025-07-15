import { Card as PlayerCard } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

interface CardDisplayProps {
  card: PlayerCard | null;
  onClose?: () => void;
  isRevealed?: boolean;
  className?: string;
  isSelected?: boolean;
  isSelectable?: boolean;
}

const rarityStyles = {
  bronze: {
    borderColor: 'rgb(var(--rarity-common))',
    backgroundColor: 'rgba(var(--rarity-common), 0.1)',
    color: 'rgb(var(--rarity-common))',
    boxShadow: 'var(--shadow-card)'
  },
  silver: {
    borderColor: 'rgb(var(--rarity-uncommon))',
    backgroundColor: 'rgba(var(--rarity-uncommon), 0.1)',
    color: 'rgb(var(--rarity-uncommon))',
    boxShadow: 'var(--shadow-card)'
  },
  gold: {
    borderColor: 'rgb(var(--rarity-rare))',
    backgroundColor: 'rgba(var(--rarity-rare), 0.1)',
    color: 'rgb(var(--rarity-rare))',
    boxShadow: 'var(--shadow-lg)'
  },
};

const CardBack = () => (
  <div className="w-full aspect-[2/3] rounded-lg p-1" style={{ 
    background: 'linear-gradient(135deg, rgb(var(--mantine-grey)) 0%, rgb(var(--mantine-grey-dark)) 100%)'
  }}>
    <div 
      className="w-full h-full border-2 rounded-md flex items-center justify-center"
      style={{ borderColor: 'rgb(var(--mantine-yellow))' }}
    >
      <div 
        className="text-2xl font-bold transform -rotate-12"
        style={{ color: 'rgb(var(--mantine-yellow))' }}
      >
        BOOSTER
      </div>
    </div>
  </div>
);

export function CardDisplay({ 
  card, 
  onClose, 
  isRevealed = true,
  className = '',
  isSelected = false,
  isSelectable = false
}: CardDisplayProps) {
  if (!card) return null;

  const rarity = card.rarity as keyof typeof rarityStyles;
  const rarityStyle = rarityStyles[rarity] || rarityStyles.bronze;

  const cardContent = (
    <div 
      className={cn('w-full max-w-sm rounded-lg border-2 transition-all duration-300 p-6', 
        className,
        { 'ring-2 ring-offset-2': isSelected },
        { 'cursor-pointer hover:scale-105': isSelectable }
      )}
             style={{
         backgroundColor: rarityStyle.backgroundColor,
         borderColor: rarityStyle.borderColor,
         boxShadow: isSelected ? 'var(--shadow-focus)' : rarityStyle.boxShadow,
         ...(isSelectable && { 
           transform: 'translateY(0)',
           transition: 'all 0.2s ease'
         })
       }}
       onMouseEnter={isSelectable ? (e) => {
         e.currentTarget.style.transform = 'translateY(-4px)';
         e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
       } : undefined}
       onMouseLeave={isSelectable ? (e) => {
         e.currentTarget.style.transform = 'translateY(0)';
         e.currentTarget.style.boxShadow = rarityStyle.boxShadow;
       } : undefined}
    >
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--mantine-black))' }}>
          {card.card_name}
        </h3>
        <p className="text-sm uppercase tracking-widest font-medium" style={{ color: rarityStyle.color }}>
          {card.rarity}
        </p>
      </div>
      
      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-3 text-center" style={{ color: 'rgb(var(--mantine-black))' }}>
          Attributes
        </h4>
        <div className="flex justify-around text-center">
          <div>
            <p className="font-bold text-xl mb-1" style={{ color: 'rgb(var(--mantine-black))' }}>
              {card.attributes.str || 'N/A'}
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--mantine-grey))' }}>
              STR
            </p>
          </div>
          <div>
            <p className="font-bold text-xl mb-1" style={{ color: 'rgb(var(--mantine-black))' }}>
              {card.attributes.dex || 'N/A'}
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--mantine-grey))' }}>
              DEX
            </p>
          </div>
          <div>
            <p className="font-bold text-xl mb-1" style={{ color: 'rgb(var(--mantine-black))' }}>
              {card.attributes.int || 'N/A'}
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--mantine-grey))' }}>
              INT
            </p>
          </div>
        </div>
      </div>
      
      {onClose && (
        <button 
          onClick={onClose} 
          className="w-full mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-primary"
        >
          <span className="mantine-Button-inner">
            <span className="mantine-Button-label">Claim Card</span>
          </span>
        </button>
      )}
    </div>
  );

  const content = isRevealed ? cardContent : <CardBack />;

  return (
    <div className={cn(
      'relative w-full max-w-xs mx-auto',
      onClose ? 'fixed inset-0 z-50 flex items-center justify-center' : ''
    )}
    style={onClose ? { backgroundColor: 'rgba(0, 0, 0, 0.5)' } : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {content}
      </motion.div>
    </div>
  );
}
