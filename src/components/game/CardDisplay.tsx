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
}

const rarityStyles = {
  bronze: 'border-amber-700 bg-amber-50 text-amber-900',
  silver: 'border-slate-400 bg-slate-100 text-slate-800',
  gold: 'border-yellow-500 bg-yellow-100 text-yellow-800 shadow-lg shadow-yellow-500/50',
};

const CardBack = () => (
  <div className="w-full aspect-[2/3] bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg p-1">
    <div className="w-full h-full border-2 border-yellow-400 rounded-md flex items-center justify-center">
      <div className="text-yellow-400 text-2xl font-bold transform -rotate-12">BOOSTER</div>
    </div>
  </div>
);

export function CardDisplay({ 
  card, 
  onClose, 
  isRevealed = true,
  className = '' 
}: CardDisplayProps) {
  if (!card) return null;

  const cardContent = (
    <Card className={cn('w-full max-w-sm border-4 transition-all duration-300', 
      rarityStyles[card.rarity],
      className
    )}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{card.card_name}</CardTitle>
        <CardDescription className="text-sm uppercase tracking-widest">
          {card.rarity}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2 text-center">Attributes</h3>
          <div className="flex justify-around text-center">
            <div>
              <p className="font-bold text-xl">{card.attributes.str || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">STR</p>
            </div>
            <div>
              <p className="font-bold text-xl">{card.attributes.dex || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">DEX</p>
            </div>
            <div>
              <p className="font-bold text-xl">{card.attributes.int || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">INT</p>
            </div>
          </div>
        </div>
        {onClose && (
          <Button onClick={onClose} className="w-full">
            Claim Card
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const content = isRevealed ? cardContent : <CardBack />;

  return (
    <div className={cn(
      'relative w-full max-w-xs mx-auto',
      onClose ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50' : ''
    )}>
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
