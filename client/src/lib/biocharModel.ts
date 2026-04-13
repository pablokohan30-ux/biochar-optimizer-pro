// Biochar Optimizer Pro — Pyrolysis Simulation Model
// Empirical model calibrated with peer-reviewed laboratory data

export interface Feedstock {
  name: string;
  C: number;
  H: number;
  N: number;
  S: number;
  O: number;
  ash: number;
  moisture: number;
  source: string;
  anchor_T: number;
  anchor_t: number;
  anchor_C: number;
  anchor_H: number;
}

export const FEEDSTOCK_DB: Record<string, Feedstock> = {
  pine_sawdust: {
     name: "Pine Sawdust (Pinus spp.)",
    C: 50.3, H: 8.3, N: 0.4, S: 0.0, O: 41.0,
    ash: 3.4, moisture: 46.0,
    source: "Peer-reviewed laboratory data (2025)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 87.4, anchor_H: 1.47,  // % H by mass at 650°C → H:Corg=0.20
  },
  eucalyptus_sawdust: {
     name: "Eucalyptus Sawdust (Eucalyptus spp.)",
    C: 46.8, H: 7.7, N: 0.3, S: 0.0, O: 45.2,
    ash: 4.4, moisture: 71.0,
    source: "Peer-reviewed laboratory data (2025)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 88.3, anchor_H: 1.48,  // % H by mass at 650°C → H:Corg=0.20
  },
  citrus_residues: {
    name: "Citrus Residues (peel/pruning)",
    C: 44.5, H: 6.8, N: 1.2, S: 0.1, O: 42.0,
    ash: 5.4, moisture: 55.0,
    source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 82.0, anchor_H: 1.93,  // % H by mass at 650°C → H:Corg=0.28
  },
  sugarcane_bagasse: {
    name: "Sugarcane Bagasse",
    C: 44.8, H: 6.3, N: 0.4, S: 0.1, O: 43.1,
    ash: 5.3, moisture: 50.0,
    source: "Literature (Awad et al. 2024)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 81.5, anchor_H: 1.98,  // % H by mass at 650°C → H:Corg=0.29
  },
  rice_husk: {
    name: "Rice Husk",
    C: 38.5, H: 5.2, N: 0.5, S: 0.1, O: 36.0,
    ash: 19.7, moisture: 10.0,
    source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 55.0, anchor_H: 1.62,  // % H by mass at 650°C → H:Corg=0.35
  },
  corn_stover: {
    name: "Corn Stover",
    C: 43.7, H: 6.2, N: 0.7, S: 0.1, O: 43.5,
    ash: 5.8, moisture: 15.0,
    source: "Literature (Leng et al. 2022)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 78.0, anchor_H: 1.96,  // % H by mass at 650°C → H:Corg=0.30
  },
  wood_chips_mixed: {
    name: "Mixed Wood Chips",
    C: 48.0, H: 7.5, N: 0.5, S: 0.0, O: 40.5,
    ash: 3.5, moisture: 35.0,
    source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30,
    anchor_C: 85.0, anchor_H: 1.78,  // % H by mass at 650°C → H:Corg=0.25
  },
};

export interface BiocharResult {
  C: number;
  H: number;
  yield_: number;
  H_Corg: number;
  O_Corg: number;
  BET: number;
  pH: number;
  credits: {
    class: string;
    sf: number;
    gross: number;
    net: number;
  };
  energy: {
    syngas_yield: number; // % mass
    syngas_hhv: number; // MJ/kg
    thermal_power_mw: number; // MW thermal (assuming 1.5 t/h input)
  };
}

/**
 * If anchor_H looks like a molar H:Corg ratio (< 0.7) instead of % H by mass,
 * convert it. Typical % H in biochar at 650C is 0.8-2.5; molar H:Corg is 0.10-0.50.
 */
export function safeAnchorH(anchorH: number, anchorC: number): number {
  if (anchorH < 0.7 && anchorC > 10) {
    return anchorH * (anchorC / 12.011) * 1.008;
  }
  return anchorH;
}

function predict_carbon(T: number, t: number, fs: Feedstock): number {
  if (!fs) return 80.0;
  const C_max = 95.0;
  const C_0 = fs.C * 1.05;
  const T_a = fs.anchor_T;
  const C_a = fs.anchor_C;
  
  let k = 0.003;
  if (C_max - C_0 > 0) {
    k = -Math.log((C_max - C_a) / (C_max - C_0)) / (T_a - 300);
  }
  
  const C_bc = C_max - (C_max - C_0) * Math.exp(-k * (T - 300));
  const t_factor = 1.0 + 0.0005 * (t - 30);
  
  return Math.min(95.0, Math.max(fs.C, C_bc * t_factor));
}

function predict_hydrogen(T: number, t: number, fs: Feedstock): number {
  if (!fs) return 2.0;
  const H_0 = fs.H;
  const H_min = 0.3;
  const T_a = fs.anchor_T;
  const H_a = safeAnchorH(fs.anchor_H, fs.anchor_C);
  
  let k = 0.004;
  if (H_0 - H_min > 0) {
    k = -Math.log((H_a - H_min) / (H_0 - H_min)) / (T_a - 300);
  }
  
  const H_bc = H_min + (H_0 - H_min) * Math.exp(-k * (T - 300));
  const t_factor = 1.0 - 0.001 * (t - 30);
  
  return Math.min(H_0, Math.max(H_min, H_bc * Math.max(0.9, t_factor)));
}

function predict_yield(T: number, t: number, fs: Feedstock): number {
  if (!fs) return 30.0;
  const ash = fs.ash;
  const yield_base = 50.0 * Math.exp(-0.0018 * (T - 300)) + ash * 0.5;
  const t_factor = 1.0 + 0.002 * (t - 30);
  return Math.min(45.0, Math.max(5.0, yield_base * t_factor));
}

function predict_H_Corg(H_bc: number, C_bc: number): number {
  const mol_H = H_bc / 1.008;
  const mol_C = C_bc / 12.011;
  return mol_C > 0 ? mol_H / mol_C : 99.0;
}

function predict_O_Corg(C_bc: number, H_bc: number, N_feed: number, ash: number): number {
  if (N_feed === undefined || ash === undefined) return 0.1;
  const O_bc = Math.max(1.0, 100.0 - C_bc - H_bc - N_feed * 0.5 - ash);
  const mol_O = O_bc / 15.999;
  const mol_C = C_bc / 12.011;
  return mol_C > 0 ? mol_O / mol_C : 99.0;
}

function predict_BET(T: number, t: number): number {
  const BET = 80 + 450 * (1 - Math.exp(-0.004 * (T - 300))) * Math.exp(-0.0002 * Math.max(0, T - 700));
  const t_factor = 1.0 + 0.004 * (t - 30);
  return Math.min(500, Math.max(10, BET * t_factor));
}

function predict_pH(T: number): number {
  return Math.min(12.0, Math.max(5.5, 5.5 + 0.009 * (T - 300)));
}

function calc_energy(T: number, yield_bc: number, fs: Feedstock) {
  if (!fs) return { syngas_yield: 20, syngas_hhv: 15, thermal_power_mw: 0 };
  // Simplified energy balance model
  // As temperature goes up, biochar yield goes down, syngas yield goes up
  // Bio-oil (tar) is assumed to be cracked into syngas at higher temps or burned
  
  // Syngas yield is roughly what's left after biochar and moisture, minus some bio-oil
  // At higher temps (>600C), bio-oil cracks into more syngas
  const moisture = fs.moisture / 100;
  const dry_mass = 1 - moisture;
  
  // Bio-oil fraction decreases with temperature
  const bio_oil_yield = Math.max(5, 30 - 0.05 * (T - 400)); 
  
  // Syngas yield (% of dry mass)
  const syngas_yield = 100 - yield_bc - bio_oil_yield;
  
  // Syngas HHV (MJ/kg) increases with temperature due to more H2 and CO
  const syngas_hhv = 12 + 0.015 * (T - 400);
  
  // Thermal power calculation — reference reactor capacity: 1.5 t/h wet biomass input
  const input_kg_h = 1500;
  const dry_input_kg_h = input_kg_h * dry_mass;
  
  // Energy from syngas (MJ/h)
  const syngas_energy_mj_h = (syngas_yield / 100) * dry_input_kg_h * syngas_hhv;
  
  // Convert MJ/h to MW (1 MJ/s = 1 MW, so divide by 3600)
  const thermal_power_mw = syngas_energy_mj_h / 3600;
  
  return {
    syngas_yield,
    syngas_hhv,
    thermal_power_mw
  };
}

function calc_credits(C_bc: number, H_Corg: number) {
  let sf = 0.0;
  let bc_class = "Not eligible";
  
  if (H_Corg < 0.4) {
    sf = 1.0;
    bc_class = "BC-1";
  } else if (H_Corg < 0.7) {
    sf = 0.9;
    bc_class = "BC-2";
  }
  
  const gross = (C_bc / 100.0) * (44.0 / 12.0);
  const net = gross * sf * 0.95;
  
  return {
    class: bc_class,
    sf,
    gross,
    net
  };
}

export function compute_all(T: number, t: number, fs: Feedstock): BiocharResult {
  const currentFs = fs || FEEDSTOCK_DB["pine_sawdust"];
  const C_bc = predict_carbon(T, t, currentFs);
  const H_bc = predict_hydrogen(T, t, currentFs);
  const yield_ = predict_yield(T, t, currentFs);
  const H_Corg = predict_H_Corg(H_bc, C_bc);
  const O_Corg = predict_O_Corg(C_bc, H_bc, currentFs.N, currentFs.ash);
  const BET = predict_BET(T, t);
  const pH = predict_pH(T);
  const credits = calc_credits(C_bc, H_Corg);
  const energy = calc_energy(T, yield_, currentFs);
  
  return {
    C: C_bc,
    H: H_bc,
    yield_,
    H_Corg,
    O_Corg,
    BET,
    pH,
    credits,
    energy
  };
}

export function find_optimum(fs: Feedstock, goal: "MAX_CARBON" | "AGRONOMY" | "BALANCED"): { T: number, t: number } {
  let best_score = -Infinity;
  let best_T = 650;
  let best_t = 30;
  
  for (let T = 400; T <= 750; T += 5) {
    for (let t = 15; t <= 60; t += 5) {
      const r = compute_all(T, t, fs);
      if (r.credits.sf === 0) continue;
      
      let score = 0;
      if (goal === "MAX_CARBON") {
        score = r.credits.net * r.yield_ / 100;
      } else if (goal === "AGRONOMY") {
        score = (r.BET / 500) * 0.5 + Math.max(0, 1 - Math.abs(r.pH - 8.5) / 3) * 0.3 + Math.max(0, 0.4 - r.H_Corg) * 0.2;
      } else { // BALANCED
        score = r.credits.net * 0.6 + (r.BET / 500) * 0.4;
      }
      
      if (score > best_score) {
        best_score = score;
        best_T = T;
        best_t = t;
      }
    }
  }
  
  return { T: best_T, t: best_t };
}
