import { OnlinePlayersList } from '@/components/game/lobby/OnlinePlayersList';
import { ChallengeToastHandler } from '@/components/game/lobby/ChallengeToastHandler';

export default function ArenaLobbyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Battle Lobby</h1>
      <div className="max-w-md mx-auto">
        <OnlinePlayersList />
      </div>
      <ChallengeToastHandler />
    </div>
  );
}
