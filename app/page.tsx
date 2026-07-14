import GameCard from '@/components/GameCard';

export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-6 sm:py-10"
      style={{ background: 'linear-gradient(160deg, #0a0e2a 0%, #12103a 55%, #1d1448 100%)' }}
    >
      {/* Decorative background orbs — Pokémon energy type themed */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="orb-float absolute -top-24 -left-24 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255, 100, 40, 0.32) 0%, transparent 70%)' }}
        />
        <div
          className="orb-float-slow absolute top-1/4 -right-20 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(60, 140, 255, 0.28) 0%, transparent 70%)',
            animationDelay: '2.5s',
          }}
        />
        <div
          className="orb-float absolute bottom-20 left-1/4 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(190, 60, 255, 0.22) 0%, transparent 70%)',
            animationDelay: '4.5s',
          }}
        />
        <div
          className="orb-float-slow absolute -bottom-8 right-1/3 w-56 h-56 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(250, 210, 40, 0.18) 0%, transparent 70%)',
            animationDelay: '1s',
          }}
        />
        <div
          className="orb-float absolute top-2/3 left-0 w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(40, 210, 140, 0.18) 0%, transparent 70%)',
            animationDelay: '3s',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-lg mx-auto">
        <header className="text-center mb-6">
          <h1
            className="text-5xl font-black tracking-tight title-shimmer"
            style={{ filter: 'drop-shadow(0 0 18px rgba(157, 53, 255, 0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          >
            Poké-Guess
          </h1>
          <p
            className="font-bold text-lg tracking-widest uppercase"
            style={{ color: '#7a5aaa', letterSpacing: '0.2em' }}
          >
            Decade Defender
          </p>
        </header>
        <GameCard />
      </div>
    </main>
  );
}
