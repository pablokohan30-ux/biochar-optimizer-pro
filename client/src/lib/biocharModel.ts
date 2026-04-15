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
    name: "Pine Sawdust (Pinus spp.)", C: 50.3, H: 8.3, N: 0.4, S: 0.0, O: 41.0,
    ash: 3.4, moisture: 46.0, source: "Peer-reviewed laboratory data (2025)",
    anchor_T: 650, anchor_t: 30, anchor_C: 87.4, anchor_H: 1.47,
  },
  eucalyptus_sawdust: {
    name: "Eucalyptus Sawdust (Eucalyptus spp.)", C: 46.8, H: 7.7, N: 0.3, S: 0.0, O: 45.2,
    ash: 4.4, moisture: 71.0, source: "Peer-reviewed laboratory data (2025)",
    anchor_T: 650, anchor_t: 30, anchor_C: 88.3, anchor_H: 1.48,
  },
  citrus_residues: {
    name: "Citrus Residues (peel/pruning)", C: 44.5, H: 6.8, N: 1.2, S: 0.1, O: 42.0,
    ash: 5.4, moisture: 55.0, source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30, anchor_C: 82.0, anchor_H: 1.93,
  },
  sugarcane_bagasse: {
    name: "Sugarcane Bagasse", C: 44.8, H: 6.3, N: 0.4, S: 0.1, O: 43.1,
    ash: 5.3, moisture: 50.0, source: "Literature (Awad et al. 2024)",
    anchor_T: 650, anchor_t: 30, anchor_C: 81.5, anchor_H: 1.98,
  },
  rice_husk: {
    name: "Rice Husk", C: 38.5, H: 5.2, N: 0.5, S: 0.1, O: 36.0,
    ash: 19.7, moisture: 10.0, source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30, anchor_C: 55.0, anchor_H: 1.62,
  },
  corn_stover: {
    name: "Corn Stover", C: 43.7, H: 6.2, N: 0.7, S: 0.1, O: 43.5,
    ash: 5.8, moisture: 15.0, source: "Literature (Leng et al. 2022)",
    anchor_T: 650, anchor_t: 30, anchor_C: 78.0, anchor_H: 1.96,
  },
  wood_chips_mixed: {
    name: "Mixed Wood Chips", C: 48.0, H: 7.5, N: 0.5, S: 0.0, O: 40.5,
    ash: 3.5, moisture: 35.0, source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30, anchor_C: 85.0, anchor_H: 1.78,
  },
  coconut_shell: {
    name: "Coconut Shell (Cocos nucifera)", C: 50.2, H: 5.7, N: 0.2, S: 0.0, O: 43.4,
    ash: 0.5, moisture: 8.0, source: "Phyllis2 / IEA Bioenergy",
    anchor_T: 650, anchor_t: 30, anchor_C: 86.0, anchor_H: 1.50,
  },
  coconut_husk: {
    name: "Coconut Husk / Coir", C: 47.6, H: 5.9, N: 0.4, S: 0.1, O: 40.8,
    ash: 5.2, moisture: 15.0, source: "Literature (Rout et al. 2016)",
    anchor_T: 650, anchor_t: 30, anchor_C: 82.0, anchor_H: 1.75,
  },
  wheat_straw: {
    name: "Wheat Straw", C: 43.2, H: 5.9, N: 0.6, S: 0.1, O: 44.5,
    ash: 5.7, moisture: 10.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 76.0, anchor_H: 2.00,
  },
  bamboo: {
    name: "Bamboo (Bambusa spp.)", C: 47.8, H: 6.5, N: 0.3, S: 0.0, O: 43.0,
    ash: 2.4, moisture: 12.0, source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30, anchor_C: 84.0, anchor_H: 1.65,
  },
  olive_pomace: {
    name: "Olive Pomace", C: 50.5, H: 6.5, N: 1.2, S: 0.1, O: 36.2,
    ash: 5.5, moisture: 60.0, source: "Literature (Zabaniotou et al. 2008)",
    anchor_T: 650, anchor_t: 30, anchor_C: 83.0, anchor_H: 1.80,
  },
  grape_pomace: {
    name: "Grape Pomace", C: 49.0, H: 6.0, N: 2.0, S: 0.1, O: 35.5,
    ash: 7.4, moisture: 65.0, source: "Literature (Muhlack et al. 2018)",
    anchor_T: 650, anchor_t: 30, anchor_C: 80.0, anchor_H: 1.85,
  },
  peanut_shell: {
    name: "Peanut Shell", C: 46.5, H: 5.6, N: 1.0, S: 0.1, O: 39.5,
    ash: 7.3, moisture: 8.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 79.0, anchor_H: 1.70,
  },
  walnut_shell: {
    name: "Walnut Shell", C: 52.3, H: 5.8, N: 0.5, S: 0.1, O: 40.1,
    ash: 1.2, moisture: 8.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 88.0, anchor_H: 1.45,
  },
  almond_shell: {
    name: "Almond Shell", C: 49.8, H: 6.1, N: 0.3, S: 0.0, O: 42.0,
    ash: 1.8, moisture: 9.0, source: "Literature (González et al. 2009)",
    anchor_T: 650, anchor_t: 30, anchor_C: 86.5, anchor_H: 1.52,
  },
  coffee_grounds: {
    name: "Spent Coffee Grounds", C: 53.0, H: 7.1, N: 2.1, S: 0.1, O: 32.8,
    ash: 4.9, moisture: 60.0, source: "Literature (Kelkar et al. 2015)",
    anchor_T: 650, anchor_t: 30, anchor_C: 82.0, anchor_H: 1.90,
  },
  coffee_husk: {
    name: "Coffee Husk / Cascara", C: 46.3, H: 6.3, N: 1.5, S: 0.1, O: 39.0,
    ash: 6.8, moisture: 12.0, source: "Literature (Setter et al. 2020)",
    anchor_T: 650, anchor_t: 30, anchor_C: 78.0, anchor_H: 1.95,
  },
  palm_kernel_shell: {
    name: "Palm Kernel Shell", C: 50.7, H: 6.0, N: 0.8, S: 0.1, O: 37.3,
    ash: 5.1, moisture: 12.0, source: "Literature (Abnisa et al. 2013)",
    anchor_T: 650, anchor_t: 30, anchor_C: 84.0, anchor_H: 1.60,
  },
  palm_empty_fruit_bunch: {
    name: "Oil Palm Empty Fruit Bunch", C: 42.8, H: 6.3, N: 0.8, S: 0.2, O: 44.0,
    ash: 5.9, moisture: 60.0, source: "Literature (Abnisa et al. 2013)",
    anchor_T: 650, anchor_t: 30, anchor_C: 76.0, anchor_H: 2.05,
  },
  soybean_straw: {
    name: "Soybean Straw", C: 44.0, H: 6.0, N: 1.0, S: 0.1, O: 42.5,
    ash: 6.4, moisture: 12.0, source: "Literature (Leng et al. 2022)",
    anchor_T: 650, anchor_t: 30, anchor_C: 77.0, anchor_H: 1.95,
  },
  cotton_stalk: {
    name: "Cotton Stalk", C: 43.5, H: 5.8, N: 1.0, S: 0.2, O: 42.0,
    ash: 7.5, moisture: 10.0, source: "Literature (Pütün et al. 2006)",
    anchor_T: 650, anchor_t: 30, anchor_C: 76.0, anchor_H: 2.00,
  },
  sunflower_husk: {
    name: "Sunflower Husk", C: 48.4, H: 6.2, N: 0.6, S: 0.1, O: 40.0,
    ash: 4.7, moisture: 9.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 83.0, anchor_H: 1.70,
  },
  miscanthus: {
    name: "Miscanthus (Elephant Grass)", C: 47.5, H: 6.2, N: 0.4, S: 0.1, O: 42.0,
    ash: 3.8, moisture: 15.0, source: "Literature (Hodgson et al. 2011)",
    anchor_T: 650, anchor_t: 30, anchor_C: 83.0, anchor_H: 1.72,
  },
  switchgrass: {
    name: "Switchgrass (Panicum virgatum)", C: 46.7, H: 5.9, N: 0.5, S: 0.1, O: 42.0,
    ash: 4.8, moisture: 13.0, source: "Literature (Imam & Capareda 2012)",
    anchor_T: 650, anchor_t: 30, anchor_C: 81.0, anchor_H: 1.80,
  },
  chicken_manure: {
    name: "Chicken / Poultry Manure", C: 35.0, H: 4.8, N: 3.5, S: 0.5, O: 30.0,
    ash: 26.2, moisture: 40.0, source: "Literature (Cantrell et al. 2012)",
    anchor_T: 650, anchor_t: 30, anchor_C: 45.0, anchor_H: 1.50,
  },
  cow_manure: {
    name: "Cow / Cattle Manure", C: 38.5, H: 5.3, N: 2.5, S: 0.4, O: 33.0,
    ash: 20.3, moisture: 75.0, source: "Literature (Cantrell et al. 2012)",
    anchor_T: 650, anchor_t: 30, anchor_C: 50.0, anchor_H: 1.60,
  },
  pig_manure: {
    name: "Pig / Swine Manure", C: 41.0, H: 5.5, N: 3.2, S: 0.6, O: 28.0,
    ash: 21.7, moisture: 70.0, source: "Literature (Cantrell et al. 2012)",
    anchor_T: 650, anchor_t: 30, anchor_C: 48.0, anchor_H: 1.55,
  },
  sewage_sludge: {
    name: "Sewage Sludge (Municipal)", C: 33.0, H: 5.0, N: 4.5, S: 1.0, O: 22.0,
    ash: 34.5, moisture: 80.0, source: "Literature (Fonts et al. 2012)",
    anchor_T: 650, anchor_t: 30, anchor_C: 35.0, anchor_H: 1.40,
  },
  hazelnut_shell: {
    name: "Hazelnut Shell", C: 50.8, H: 5.6, N: 0.4, S: 0.0, O: 41.5,
    ash: 1.7, moisture: 8.0, source: "Literature (Demirbaş 2001)",
    anchor_T: 650, anchor_t: 30, anchor_C: 87.0, anchor_H: 1.48,
  },
  macadamia_shell: {
    name: "Macadamia Nut Shell", C: 51.5, H: 5.5, N: 0.2, S: 0.0, O: 42.0,
    ash: 0.8, moisture: 7.0, source: "Literature (Wechsler et al. 2013)",
    anchor_T: 650, anchor_t: 30, anchor_C: 88.5, anchor_H: 1.42,
  },
  oak_wood: {
    name: "Oak Wood", C: 49.5, H: 6.0, N: 0.2, S: 0.0, O: 43.5,
    ash: 0.8, moisture: 20.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 87.0, anchor_H: 1.55,
  },
  birch_wood: {
    name: "Birch Wood", C: 48.8, H: 6.4, N: 0.1, S: 0.0, O: 44.2,
    ash: 0.5, moisture: 22.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 86.5, anchor_H: 1.58,
  },
  willow_wood: {
    name: "Willow Wood (Salix spp.)", C: 49.0, H: 6.1, N: 0.5, S: 0.0, O: 43.0,
    ash: 1.4, moisture: 50.0, source: "Literature (Serapiglia et al. 2013)",
    anchor_T: 650, anchor_t: 30, anchor_C: 85.5, anchor_H: 1.60,
  },
  poplar_wood: {
    name: "Poplar Wood (Populus spp.)", C: 48.5, H: 6.2, N: 0.4, S: 0.0, O: 43.5,
    ash: 1.4, moisture: 45.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 85.0, anchor_H: 1.62,
  },
  teak_wood: {
    name: "Teak Wood (Tectona grandis)", C: 49.0, H: 6.0, N: 0.3, S: 0.0, O: 43.5,
    ash: 1.2, moisture: 15.0, source: "Literature",
    anchor_T: 650, anchor_t: 30, anchor_C: 86.0, anchor_H: 1.55,
  },
  yerba_mate: {
    name: "Yerba Mate Residues", C: 45.0, H: 6.0, N: 2.0, S: 0.1, O: 38.0,
    ash: 8.9, moisture: 10.0, source: "Literature (INTA Argentina)",
    anchor_T: 650, anchor_t: 30, anchor_C: 75.0, anchor_H: 1.90,
  },
  tea_waste: {
    name: "Tea Waste / Spent Tea Leaves", C: 47.5, H: 5.8, N: 3.5, S: 0.2, O: 36.0,
    ash: 7.0, moisture: 8.0, source: "Literature (Uzun et al. 2010)",
    anchor_T: 650, anchor_t: 30, anchor_C: 78.0, anchor_H: 1.85,
  },
  banana_stem: {
    name: "Banana Stem / Pseudostem", C: 39.5, H: 5.5, N: 0.8, S: 0.1, O: 42.0,
    ash: 12.1, moisture: 90.0, source: "Literature (Sartori et al. 2015)",
    anchor_T: 650, anchor_t: 30, anchor_C: 68.0, anchor_H: 2.10,
  },
  banana_peel: {
    name: "Banana Peel", C: 41.0, H: 5.8, N: 1.2, S: 0.1, O: 40.5,
    ash: 11.4, moisture: 85.0, source: "Literature (Sartori et al. 2015)",
    anchor_T: 650, anchor_t: 30, anchor_C: 70.0, anchor_H: 2.05,
  },
  corn_cob: {
    name: "Corn Cob", C: 46.0, H: 5.6, N: 0.5, S: 0.0, O: 44.5,
    ash: 3.4, moisture: 10.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 82.0, anchor_H: 1.75,
  },
  rice_straw: {
    name: "Rice Straw", C: 39.0, H: 5.0, N: 0.7, S: 0.1, O: 38.0,
    ash: 17.2, moisture: 12.0, source: "Literature (Li et al. 2019)",
    anchor_T: 650, anchor_t: 30, anchor_C: 58.0, anchor_H: 1.70,
  },
  sorghum_straw: {
    name: "Sorghum Straw", C: 44.0, H: 6.0, N: 0.6, S: 0.1, O: 43.0,
    ash: 6.3, moisture: 12.0, source: "Literature (Leng et al. 2022)",
    anchor_T: 650, anchor_t: 30, anchor_C: 77.0, anchor_H: 1.92,
  },
  hemp_stalk: {
    name: "Hemp Stalk (Cannabis sativa)", C: 46.0, H: 6.2, N: 0.8, S: 0.1, O: 42.0,
    ash: 4.9, moisture: 12.0, source: "Literature (Prade et al. 2011)",
    anchor_T: 650, anchor_t: 30, anchor_C: 81.0, anchor_H: 1.78,
  },
  jatropha_seed_cake: {
    name: "Jatropha Seed Cake", C: 52.0, H: 6.8, N: 5.5, S: 0.2, O: 28.0,
    ash: 7.5, moisture: 8.0, source: "Literature (Mythili & Venkatachalam 2013)",
    anchor_T: 650, anchor_t: 30, anchor_C: 78.0, anchor_H: 1.85,
  },
  cassava_stalk: {
    name: "Cassava Stalk (Manihot esculenta)", C: 44.5, H: 6.0, N: 0.7, S: 0.1, O: 42.5,
    ash: 6.2, moisture: 15.0, source: "Literature",
    anchor_T: 650, anchor_t: 30, anchor_C: 78.0, anchor_H: 1.90,
  },
  cacao_pod_husk: {
    name: "Cacao Pod Husk", C: 43.0, H: 5.5, N: 1.5, S: 0.1, O: 38.5,
    ash: 11.4, moisture: 12.0, source: "Literature (Tsai et al. 2017)",
    anchor_T: 650, anchor_t: 30, anchor_C: 72.0, anchor_H: 1.95,
  },
  agave_bagasse: {
    name: "Agave Bagasse (Tequila)", C: 44.0, H: 6.5, N: 0.5, S: 0.1, O: 43.0,
    ash: 5.9, moisture: 12.0, source: "Literature (Iñiguez-Covarrubias et al.)",
    anchor_T: 650, anchor_t: 30, anchor_C: 75.0, anchor_H: 1.76,
  },
  vineyard_pruning: {
    name: "Vineyard Pruning", C: 47.0, H: 6.0, N: 0.6, S: 0.0, O: 43.0,
    ash: 3.4, moisture: 35.0, source: "Literature (Duca et al. 2016)",
    anchor_T: 650, anchor_t: 30, anchor_C: 83.0, anchor_H: 1.68,
  },
  fruit_tree_pruning: {
    name: "Fruit Tree Pruning (Apple/Pear)", C: 47.5, H: 6.1, N: 0.4, S: 0.0, O: 43.5,
    ash: 2.5, moisture: 30.0, source: "Literature",
    anchor_T: 650, anchor_t: 30, anchor_C: 84.0, anchor_H: 1.65,
  },
  softwood_bark: {
    name: "Softwood Bark (Pine/Spruce)", C: 52.0, H: 5.8, N: 0.3, S: 0.0, O: 38.5,
    ash: 3.4, moisture: 55.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 85.0, anchor_H: 1.55,
  },
  hardwood_bark: {
    name: "Hardwood Bark (Oak/Beech)", C: 49.5, H: 5.5, N: 0.4, S: 0.0, O: 40.5,
    ash: 4.1, moisture: 50.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 83.0, anchor_H: 1.60,
  },
  sawmill_dust: {
    name: "Sawmill Dust (Mixed)", C: 49.0, H: 6.5, N: 0.3, S: 0.0, O: 42.5,
    ash: 1.7, moisture: 12.0, source: "Phyllis2 Database",
    anchor_T: 650, anchor_t: 30, anchor_C: 86.0, anchor_H: 1.58,
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

/** 15 biomasses available on the free tier — the most globally common ones. */
export const FREE_FEEDSTOCK_IDS = [
  "pine_sawdust",
  "eucalyptus_sawdust",
  "wood_chips_mixed",
  "oak_wood",
  "rice_husk",
  "corn_stover",
  "sugarcane_bagasse",
  "wheat_straw",
  "soybean_straw",
  "coconut_shell",
  "bamboo",
  "coffee_grounds",
  "walnut_shell",
  "palm_kernel_shell",
  "poplar_wood",
];

export function isFreeFeedstock(id: string): boolean {
  return FREE_FEEDSTOCK_IDS.includes(id);
}

export type SearchResult =
  | { status: "found"; feedstock: Feedstock; id: string }
  | { status: "locked"; feedstock: Feedstock; id: string }
  | { status: "not_found" };

/** Search the local feedstock database by name (fuzzy match). */
export function searchFeedstockLocal(query: string, freeOnly: boolean = false): SearchResult {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let bestId: string | null = null;
  let bestScore = 0;

  for (const [id, fs] of Object.entries(FEEDSTOCK_DB)) {
    const name = fs.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Exact substring match
    if (name.includes(q) || q.includes(name.split("(")[0].trim())) {
      bestId = id;
      bestScore = 999;
      break;
    }
    // Word-level scoring
    const queryWords = q.split(/\s+/);
    const nameWords = name.split(/[\s/()]+/);
    let score = 0;
    for (const qw of queryWords) {
      for (const nw of nameWords) {
        if (nw.includes(qw) || qw.includes(nw)) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  if (!bestId || bestScore === 0) return { status: "not_found" };

  const feedstock = FEEDSTOCK_DB[bestId];
  if (freeOnly && !isFreeFeedstock(bestId)) {
    return { status: "locked", feedstock, id: bestId };
  }
  return { status: "found", feedstock, id: bestId };
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
