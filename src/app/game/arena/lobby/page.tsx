import CreateChallenge from '@/components/game/battle/CreateChallenge';
import ChallengeList from '@/components/game/battle/ChallengeList';
import Link from 'next/link';

export default function ArenaLobbyPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Arena Lobby</h1>
        <Link href="/game/arena/history" className="text-blue-500 hover:underline">
          View Battle History
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Create a New Challenge</h2>
          <CreateChallenge />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Open Challenges</h2>
          <ChallengeList />
        </div>
      </div>
    </div>
  );
}
