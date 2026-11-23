import fs from 'fs';
import path from 'path';
import readline from 'readline';

export interface IndexedVehicle {
  make: string;
  model: string;
  fullName: string;
  fuel: string; // 'Petrol' | 'Diesel' | 'EV' | 'CNG' | 'Hybrid'
}

class VehicleDatasetService {
  private vehicles: IndexedVehicle[] = [];
  private isLoaded = false;

  constructor() {
    this.init();
  }

  public async init() {
    if (this.isLoaded) return;
    try {
      const dataDir = path.resolve(__dirname, '../../../../data');
      const indexPath = path.join(dataDir, 'vehicle_dataset_index.json');
      const csvPath = path.resolve(__dirname, '../../../../cars_dataset.csv');

      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf8');
        this.vehicles = JSON.parse(raw);
        this.isLoaded = true;
        console.log(`[VehicleDatasetService] Loaded ${this.vehicles.length} vehicles from index.`);
        return;
      }

      // If index doesn't exist yet, build from CSV
      if (fs.existsSync(csvPath)) {
        console.log('[VehicleDatasetService] Building vehicle index from cars_dataset.csv...');
        const map = new Map<string, IndexedVehicle>();
        const fileStream = fs.createReadStream(csvPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let row = 0;
        for await (const line of rl) {
          row++;
          if (row === 1) continue;
          const parts = line.split(',');
          const make = parts[4]?.trim();
          const model = parts[5]?.trim();
          const fuelRaw = parts[44]?.trim();
          if (make && model && fuelRaw) {
            let fuel = 'Petrol';
            const fLower = fuelRaw.toLowerCase();
            if (fLower.includes('electric') || fLower.includes('ev')) fuel = 'EV';
            else if (fLower.includes('diesel')) fuel = 'Diesel';
            else if (fLower.includes('cng')) fuel = 'CNG';
            else if (fLower.includes('hybrid')) fuel = 'Hybrid';

            const fullName = `${make} ${model}`;
            const key = fullName.toLowerCase();
            if (!map.has(key)) {
              map.set(key, { make, model, fullName, fuel });
            }
          }
        }

        // Add verified common entries
        map.set('mahindra be 6', { make: 'Mahindra', model: 'BE 6', fullName: 'Mahindra BE 6', fuel: 'EV' });
        map.set('tata suv', { make: 'Tata', model: 'SUV', fullName: 'Tata SUV', fuel: 'Diesel' });

        this.vehicles = Array.from(map.values());
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(indexPath, JSON.stringify(this.vehicles, null, 2), 'utf8');
        this.isLoaded = true;
        console.log(`[VehicleDatasetService] Built & indexed ${this.vehicles.length} vehicles.`);
      }
    } catch (e) {
      console.error('[VehicleDatasetService] Error initializing vehicle dataset:', e);
    }
  }

  public search(query: string, limit = 8): IndexedVehicle[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const matches: IndexedVehicle[] = [];
    for (const v of this.vehicles) {
      if (
        v.fullName.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q)
      ) {
        matches.push(v);
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  public detectType(name: string): { fuelEnum: 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID'; type: string } {
    const clean = name.trim().toLowerCase();
    if (!clean) return { fuelEnum: 'PETROL', type: 'Petrol' };

    // 1. Direct match in dataset
    const directMatch = this.vehicles.find(
      (v) => v.fullName.toLowerCase() === clean || v.model.toLowerCase() === clean
    );
    if (directMatch) {
      const f = directMatch.fuel;
      const fuelEnum =
        f === 'EV'
          ? 'ELECTRIC'
          : f === 'CNG'
          ? 'CNG'
          : f === 'Diesel'
          ? 'DIESEL'
          : f === 'Hybrid'
          ? 'HYBRID'
          : 'PETROL';
      return { fuelEnum, type: f };
    }

    // 2. Keyword fallback for variations
    if (
      clean.includes('ev') ||
      clean.includes('electric') ||
      clean.includes('be 6') ||
      clean.includes('be.05') ||
      clean.includes('be05') ||
      clean.includes('be6') ||
      clean.includes('curvv') ||
      clean.includes('ioniq') ||
      clean.includes('ola') ||
      clean.includes('ather') ||
      clean.includes('chetak') ||
      clean.includes('iqube')
    ) {
      return { fuelEnum: 'ELECTRIC', type: 'EV' };
    }

    if (clean.includes('cng') || clean.includes('icng') || clean.includes('s-cng')) {
      return { fuelEnum: 'CNG', type: 'CNG' };
    }

    if (clean.includes('hybrid') || clean.includes('hyryder') || clean.includes('hycross') || clean.includes('e:hev')) {
      return { fuelEnum: 'HYBRID', type: 'Hybrid' };
    }

    if (
      clean.includes('diesel') ||
      clean.includes('suv') ||
      clean.includes('thar') ||
      clean.includes('scorpio') ||
      clean.includes('bolero') ||
      clean.includes('harrier') ||
      clean.includes('safari') ||
      clean.includes('fortuner')
    ) {
      return { fuelEnum: 'DIESEL', type: 'Diesel' };
    }

    return { fuelEnum: 'PETROL', type: 'Petrol' };
  }
}

export const vehicleDatasetService = new VehicleDatasetService();

