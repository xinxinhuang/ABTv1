import { OnlinePlayersList } from '@/components/game/lobby/OnlinePlayersList';
import { ChallengeToastHandler } from '@/components/game/lobby/ChallengeToastHandler';
import { GameLayout, Card } from '@/components/layout/GameLayout';
import { History } from 'lucide-react';
import Link from 'next/link';

export default function ArenaLobbyPage() {
  return (
    <GameLayout
      title="Battle Arena"
      subtitle="Challenge other players and climb the leaderboard"
      actions={
        <Link 
          href="/game/arena/history" 
          className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
        >
          <History className="w-4 h-4" />
          Battle History
        </Link>
      }
    >
      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Online Players
            </h2>
            <p className="text-sm text-muted-foreground">
              Challenge other players to a battle
            </p>
          </div>
          <OnlinePlayersList />
        </Card>
      </div>

      <ChallengeToastHandler />
    </GameLayout>
  );
}
