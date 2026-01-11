import { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import type { Movie } from '../services/tmdb';

interface RouletteProps {
  movies: Movie[];
  onSpinEnd: (movie: Movie) => void;
}

const backgroundColors = ["#E53E3E", "#2D3748", "#D69E2E", "#4299E1", "#E53E3E", "#2D3748", "#D69E2E", "#4299E1"];
const textColors = ['#ffffff'];

export function Roulette({ movies, onSpinEnd }: RouletteProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const data = movies.map(movie => ({
    option: movie.title.length > 20 ? movie.title.substring(0, 20) + '...' : movie.title,
  }));

  const handleSpinClick = () => {
    if (!mustSpin && data.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={data}
        backgroundColors={backgroundColors}
        textColors={textColors}
        outerBorderColor={"#4A5568"}
        outerBorderWidth={5}
        innerBorderColor={"#4A5568"}
        innerBorderWidth={10}
        radiusLineColor={"#4A5568"}
        radiusLineWidth={2}
        fontSize={14}
        onStopSpinning={() => {
          setMustSpin(false);
          onSpinEnd(movies[prizeNumber]);
        }}
      />
      <button
        onClick={handleSpinClick}
        disabled={mustSpin || movies.length === 0}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-xl disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {mustSpin ? "Girando..." : "Girar Roleta!"}
      </button>
    </div>
  );
}
