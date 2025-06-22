export interface ConflictZone {
  id: string;
  name: string;
  countries: string[]; // Array of country codes
  intensity: 'low' | 'medium' | 'high';
  type: 'civil_war' | 'international' | 'insurgency' | 'border_dispute' | 'other';
  startYear: number;
  endYear?: number;
  description: string;
}

export const conflictZones: ConflictZone[] = [
  {
    id: 'syria',
    name: 'Syrian Civil War',
    countries: ['SYR', 'TUR', 'IRQ', 'ISR'],
    intensity: 'high',
    type: 'civil_war',
    startYear: 2011,
    description: 'Ongoing multi-sided civil war in Syria'
  },
  {
    id: 'ukraine',
    name: 'Russo-Ukrainian War',
    countries: ['UKR', 'RUS'],
    intensity: 'high',
    type: 'international',
    startYear: 2014,
    description: 'Armed conflict between Russia and Ukraine'
  },
  {
    id: 'yemen',
    name: 'Yemeni Civil War',
    countries: ['YEM', 'SAU'],
    intensity: 'high',
    type: 'civil_war',
    startYear: 2014,
    description: 'Ongoing conflict involving Houthi rebels and the Yemeni government'
  },
  {
    id: 'kashmir',
    name: 'Kashmir Conflict',
    countries: ['IND', 'PAK', 'CHN'],
    intensity: 'medium',
    type: 'border_dispute',
    startYear: 1947,
    description: 'Territorial conflict primarily between India and Pakistan'
  },
  {
    id: 'south_china_sea',
    name: 'South China Sea Disputes',
    countries: ['CHN', 'PHL', 'VNM', 'MYS', 'BRN', 'TWN'],
    intensity: 'medium',
    type: 'border_dispute',
    startYear: 1947,
    description: 'Maritime and territorial disputes in the South China Sea'
  }
];
