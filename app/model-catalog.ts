export type ModelOption = {
  id: string;
  label: string;
  params: string;
  quantization: string;
  loaded: boolean;
  note: string;
  rank: number;
};

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: "llama-3.1-8b-lexi-uncensored-v2-heretic",
    label: "Lexi Uncensored Heretic",
    params: "8B",
    quantization: "Q5_K_M",
    loaded: false,
    note: "Equilibrio recomendado",
    rank: 1,
  },
  {
    id: "rocinante-x-12b-v1b",
    label: "Rocinante X 12B",
    params: "12B",
    quantization: "Q4_K_M",
    loaded: false,
    note: "Narrativa recomendada",
    rank: 2,
  },
  {
    id: "mn-velvetcafe-rp-12b-v2",
    label: "VelvetCafe RP 12B",
    params: "12B",
    quantization: "Q4_K_M",
    loaded: false,
    note: "Roleplay recomendado",
    rank: 3,
  },
  {
    id: "mistral-helcyon-mercury-12b-v3.2",
    label: "Helcyon Mercury 12B",
    params: "12B",
    quantization: "Q4_K_M",
    loaded: false,
    note: "Prosa atmosférica",
    rank: 4,
  },
  {
    id: "mistral-nemo-instruct-2407-heretic",
    label: "Mistral Nemo Heretic",
    params: "12B",
    quantization: "Q4_K_M",
    loaded: false,
    note: "General y consistente",
    rank: 5,
  },
  {
    id: "darkidol-llama-3.1-8b-instruct-1.2-uncensored",
    label: "DarkIdol Uncensored",
    params: "8B",
    quantization: "Q4_K_M",
    loaded: false,
    note: "El más rápido",
    rank: 6,
  },
  {
    id: "qwen2.5-14b_uncensored_instruct",
    label: "Qwen2.5 Uncensored",
    params: "15B",
    quantization: "Q4_K_S",
    loaded: false,
    note: "Coherente, más lento",
    rank: 7,
  },
  {
    id: "thedrummer_cydonia-24b-v4",
    label: "Cydonia 24B",
    params: "24B",
    quantization: "Q3_K_M",
    loaded: false,
    note: "Muy pesado para esta PC",
    rank: 8,
  },
];

export const MODEL_PROFILE = new Map(MODEL_CATALOG.map((model) => [model.id, model]));
