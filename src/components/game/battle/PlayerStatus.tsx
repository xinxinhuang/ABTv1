'use client';

interface PlayerStatusProps {
  name: string;
  isReady: boolean;
}

export function PlayerStatus({ name, isReady }: PlayerStatusProps) {
  return (
    <div className="p-4 border rounded-lg shadow-md bg-gray-800">
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <p className={`mt-2 font-semibold ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
        {isReady ? 'Ready' : 'Selecting Cards...'}
      </p>
    </div>
  );
}
