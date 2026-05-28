import { Beer } from '../proto/beer';

// All beers have unique prep time, volume, and pour time (per spec)
export const beers: Beer[] = [
  { id: 1,  name: 'Pilsner Urquell',   bartender_preparation_time: 1,  volume: 300, pour_time: 4  },
  { id: 2,  name: 'Heineken',          bartender_preparation_time: 2,  volume: 330, pour_time: 5  },
  { id: 3,  name: 'Corona Extra',      bartender_preparation_time: 3,  volume: 355, pour_time: 6  },
  { id: 4,  name: 'Stella Artois',     bartender_preparation_time: 4,  volume: 400, pour_time: 7  },
  { id: 5,  name: 'IPA Hoppinator',    bartender_preparation_time: 5,  volume: 440, pour_time: 8  },
  { id: 6,  name: 'Bud Light',         bartender_preparation_time: 6,  volume: 473, pour_time: 9  },
  { id: 7,  name: 'Weizen',            bartender_preparation_time: 7,  volume: 500, pour_time: 10 },
  { id: 8,  name: 'Guinness',          bartender_preparation_time: 8,  volume: 568, pour_time: 13 },
  { id: 9,  name: 'Hoegaarden',        bartender_preparation_time: 9,  volume: 250, pour_time: 3  },
  { id: 10, name: 'Leffe Blonde',      bartender_preparation_time: 10, volume: 600, pour_time: 11 },
  { id: 11, name: 'Tripel Karmeliet',  bartender_preparation_time: 11, volume: 650, pour_time: 12 },
  { id: 12, name: 'La Chouffe',        bartender_preparation_time: 12, volume: 750, pour_time: 14 },
];

export const beersById = new Map(beers.map((b) => [b.id, b]));
