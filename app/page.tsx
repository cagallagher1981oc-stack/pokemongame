import GameCard from '@/components/GameCard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 px-4 py-6">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-black text-indigo-900 tracking-tight">
            Poké-Guess
          </h1>
          <p className="text-indigo-600 font-bold text-lg">Decade Defender</p>
        </header>
        <GameCard />
      </div>
    </main>
  );
}
