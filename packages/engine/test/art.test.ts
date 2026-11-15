import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { artProblems } from '../src/art-check';
import { ladderProblems } from '../src/art-ladder-check';
import { paletteProblems } from '../src/art-palette';

// Every picture and ladder in content/art/ must pass the picture checker
// (docs/decisions/shared-pictures.md). `npm run journeys` runs this file.
const dir = join(import.meta.dirname, '..', '..', '..', 'content', 'art');
const files = readdirSync(dir).sort();
const pictures = files.filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
const ladders = files.filter((f) => f.endsWith('.ladder.json'));
const read = (file: string): unknown => JSON.parse(readFileSync(join(dir, file), 'utf8'));
const palette = read('palette.json') as Record<string, unknown>;

describe('pictures in content/art', () => {
  it('exist', () => {
    expect(pictures.length).toBeGreaterThan(2);
  });

  it('are pictures, ladders and the palette only', () => {
    const known = (f: string) => f.endsWith('.svg') || f.endsWith('.ladder.json');
    expect(files.filter((f) => !known(f))).toEqual(['palette.json']);
  });

  it('have flowers as the only marker: no pennants, lanterns or posts (#152)', () => {
    expect(
      pictures.filter(
        (name) => name.startsWith('marker-') && !/^marker-flower-\d+(-open)?$/.test(name),
      ),
    ).toEqual([]);
    expect(pictures.filter((name) => /-cord-\d+$/.test(name))).toEqual([]);
  });

  it('have a palette whose every hue keeps its contrasts in both styles', () => {
    expect(paletteProblems(palette)).toEqual([]);
  });

  it('have the ladders garden, home, lookout and well', () => {
    expect(ladders).toEqual([
      'garden.ladder.json',
      'home.ladder.json',
      'lookout.ladder.json',
      'well.ladder.json',
    ]);
  });

  it.each(ladders)('%s passes the ladder checker', (file) => {
    const sources = Object.fromEntries(
      pictures.map((name) => [name, readFileSync(join(dir, `${name}.svg`), 'utf8')]),
    );
    expect(ladderProblems(read(file), pictures, Object.keys(palette), sources)).toEqual([]);
  });

  it.each(pictures)('%s passes the picture checker', (name) => {
    expect(artProblems(name, readFileSync(join(dir, `${name}.svg`), 'utf8'))).toEqual([]);
  });
});
