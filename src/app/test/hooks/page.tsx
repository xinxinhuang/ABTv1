'use client';

import { useCountdownTimer } from '@/hooks/battle-v2/useCountdownTimer';

// Simple manual test page for hooks
export default function HooksTestPage() {
    const { seconds, isActive, start, stop, reset } = useCountdownTimer();

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Hook Testing Page</h1>

            <div className="bg-gray-100 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">useCountdownTimer Hook Test</h2>
                <div className="space-y-2">
                    <p>Seconds: <span className="font-bold">{seconds}</span></p>
                    <p>Active: <span className="font-bold">{isActive ? 'Yes' : 'No'}</span></p>

                    <div className="space-x-2">
                        <button
                            onClick={() => start(10)}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Start 10s
                        </button>
                        <button
                            onClick={() => start(5)}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                            Start 5s
                        </button>
                        <button
                            onClick={stop}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Stop
                        </button>
                        <button
                            onClick={reset}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <h3 className="font-semibold text-yellow-800">Testing Instructions:</h3>
                <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
                    <li>Click "Start 10s" or "Start 5s" to begin countdown</li>
                    <li>Watch the seconds count down</li>
                    <li>Click "Stop" to pause the countdown</li>
                    <li>Click "Reset" to reset to 0</li>
                    <li>Test multiple starts to ensure previous timers are cleared</li>
                </ul>
            </div>
        </div>
    );
}