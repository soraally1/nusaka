import React from 'react';
import PokemonCard from './HewanCard';

interface Pokemon {
  id: number;
  instanceId?: string;
  name?: string;
  nickname?: string;
  level?: number;
  exp?: number;
  element?: string;
  type?: string;    // creature type (Sky, Dragon, Beast, etc.)
  image?: string;
  isEmpty?: boolean;
}

interface PokemonGridProps {
  pokemons: Pokemon[];
}

const PokemonGrid = ({ pokemons }: PokemonGridProps) => {
  return (
    <div className="flex md:grid flex-row md:grid-cols-2 overflow-x-auto md:overflow-visible gap-4 md:gap-x-6 gap-y-4 pt-2 pb-4 md:pb-0 snap-x snap-mandatory hide-scroll">
      {pokemons.map((pokemon, i) => (
        <div key={pokemon.instanceId || `${pokemon.id}-${i}`} className="min-w-[85vw] md:min-w-0 snap-center">
          <PokemonCard
            name={pokemon.nickname || pokemon.name}
            level={pokemon.level}
            exp={pokemon.exp}
            element={pokemon.element}
            creatureType={pokemon.type}
            image={pokemon.image}
            isEmpty={pokemon.isEmpty}
          />
        </div>
      ))}
    </div>
  );
};

export default PokemonGrid;
