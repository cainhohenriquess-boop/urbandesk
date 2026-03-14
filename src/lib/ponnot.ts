export const PONNOT_FIELD_ALIASES = {
  COD_ID: ["COD_ID", "CODID"],
  ESTR: ["ESTR"],
  ALT: ["ALT"],
  ESF: ["ESF"],
  QTD_UCS: ["QTD_UCS", "QTDUCS"],
} as const;

const PONNOT_ALT_VALUES = [
  "0",
  "4.3",
  "4.5",
  "5",
  "6",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "10",
  "10.5",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "17.5",
  "18",
  "19",
  "20",
  "20.5",
  "21",
  "21.5",
  "22",
  "23",
  "23.5",
  "24",
  "24.6",
  "25",
  "26",
  "26.6",
  "27",
  "27.6",
  "27.7",
  "28",
  "28.6",
  "28.7",
  "29",
  "29.6",
  "29.7",
  "30",
  "30.2",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "50",
  "51",
  "52",
  "54",
  "64",
  "66",
  "84",
  "53",
  "55",
  "56",
  "57",
  "58",
  "59",
  "60",
  "61",
  "62",
  "63",
  "65",
  "67",
  "68",
  "69",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "77",
  "78",
  "79",
  "80",
  "81",
  "82",
  "83",
  "85",
  "86",
  "87",
  "88",
  "89",
  "90",
] as const;

const PONNOT_ESF_VALUES: Record<string, string> = {
  "3": "90",
  "4": "100",
  "5": "150",
  "6": "200",
  "7": "300",
  "8": "400",
  "9": "450",
  "10": "500",
  "11": "600",
  "12": "700",
  "13": "750",
  "14": "800",
  "15": "850",
  "16": "900",
  "17": "950",
  "18": "1000",
  "19": "1050",
  "20": "1100",
  "21": "1150",
  "22": "1200",
  "23": "1250",
  "24": "1300",
  "25": "1350",
  "26": "1400",
  "27": "1450",
  "28": "1500",
  "29": "1550",
  "30": "1600",
  "31": "1650",
  "32": "1700",
  "33": "1750",
  "34": "1800",
  "35": "2000",
  "36": "2400",
  "37": "2500",
  "38": "2600",
  "39": "2700",
  "40": "2800",
  "41": "2900",
  "42": "3000",
  "43": "3100",
  "44": "3200",
  "45": "3300",
  "46": "3400",
  "47": "3500",
  "48": "3600",
  "49": "3700",
  "50": "3800",
  "51": "3900",
  "52": "4000",
  "53": "4100",
  "54": "4200",
  "55": "4300",
  "56": "4400",
  "57": "4500",
  "58": "4600",
  "59": "4700",
  "60": "4800",
  "61": "4900",
  "62": "5000",
  "63": "5100",
  "64": "5600",
  "65": "5700",
  "72": "250",
  "73": "1900",
  "74": "2100",
  "75": "2200",
  "76": "2300",
};

function normalizeScalarString(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeQtdUcs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
  }

  return null;
}

function getLinkedUcCount(
  codId: string | null,
  linkedCounts?: Record<string, number> | Map<string, number> | null
) {
  if (!codId || !linkedCounts) return null;

  const rawValue = linkedCounts instanceof Map ? linkedCounts.get(codId) : linkedCounts[codId];
  return normalizeQtdUcs(rawValue);
}

export function decodePonnotAlt(value: unknown) {
  const normalized = normalizeScalarString(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= PONNOT_ALT_VALUES.length) {
    return null;
  }

  return PONNOT_ALT_VALUES[parsed];
}

export function decodePonnotEsf(value: unknown) {
  const normalized = normalizeScalarString(value);
  if (!normalized) return null;
  return PONNOT_ESF_VALUES[normalized] ?? null;
}

export function resolvePonnotQtdUcs(input: {
  rawQtdUcs?: unknown;
  codId: string | null;
  linkedUcCountsByCodId?: Record<string, number> | Map<string, number> | null;
}) {
  const directValue = normalizeQtdUcs(input.rawQtdUcs);
  if (directValue !== null) {
    return directValue;
  }

  const linkedValue = getLinkedUcCount(input.codId, input.linkedUcCountsByCodId);
  if (linkedValue !== null) {
    return linkedValue;
  }

  return 0;
}

export function buildPonnotLine2(input: {
  estr: string | null;
  altDecoded: string | null;
  esfDecoded: string | null;
}) {
  const rightSegment = input.altDecoded
    ? `${input.altDecoded}${input.esfDecoded ? `/${input.esfDecoded}` : ""}`
    : null;

  const line = [input.estr, rightSegment].filter(Boolean).join(" ").trim();
  return line.length > 0 ? line : null;
}

export function buildPonnotLabel(input: {
  codId: string | null;
  estr: string | null;
  altDecoded: string | null;
  esfDecoded: string | null;
  qtdUcs: number;
}) {
  const line1 = input.codId ?? "";
  const line2 = buildPonnotLine2({
    estr: input.estr,
    altDecoded: input.altDecoded,
    esfDecoded: input.esfDecoded,
  });
  const line3 = `QTD_UCS: ${input.qtdUcs}`;

  return [line1, line2, line3].filter((value) => value && value.length > 0).join("\n");
}
