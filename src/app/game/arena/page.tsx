import Link from 'next/link';

export default function ArenaPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Battle Arena</h1>
      <p className="mb-4">Welcome to the Arena! Here you can challenge other players to battle.</p>
      <Link href="/game/arena/lobby" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Enter Lobby
      </Link>
    </div>
  );
}
