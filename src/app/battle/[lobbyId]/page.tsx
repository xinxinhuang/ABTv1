'use client';

import { useParams } from 'next/navigation';

export default function BattlePage() {
  const params = useParams();
  const lobbyId = params.lobbyId;

  return (
    <div className="container mx-auto p-4 text-white">
      <h1 className="text-3xl font-bold mb-4">Battle Arena</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <p className="text-lg">Welcome to the battle lobby!</p>
        <p className="mt-2">Your game is about to begin.</p>
        <p className="mt-4">Lobby ID: <span className="font-mono bg-gray-700 p-1 rounded">{lobbyId as string}</span></p>
        <p className="mt-6 text-yellow-400">This is the placeholder for the battle screen. The next step is to build the card selection and gameplay UI here.</p>
      </div>
    </div>
  );
}
