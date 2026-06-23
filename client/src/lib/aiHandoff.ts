const AI_HANDOFF_REGEX = /^Borrador creado desde AI Builder \(#(\d+)\)\./i;
const LEGACY_AI_HANDOFF_REGEX = /^Imported from AI-generated project #(\d+)$/i;

export function buildAiHandoffDescription(aiProjectId: number) {
  return `Borrador creado desde AI Builder (#${aiProjectId}). Siguiente paso: revisar el PDD y completar datos específicos antes de usarlo como proyecto operativo.`;
}

export function buildLegacyAiHandoffDescription(aiProjectId: number) {
  return `Imported from AI-generated project #${aiProjectId}`;
}

export function buildAiHandoffLikeDescription(aiProjectId: number) {
  return `Borrador creado desde AI Builder (#${aiProjectId}).%`;
}

export function buildLegacyAiHandoffLikeDescription(aiProjectId: number) {
  return `Imported from AI-generated project #${aiProjectId}%`;
}

export function parseAiHandoffDescription(description?: string | null) {
  if (!description) return { isAiHandoff: false, aiProjectId: null as number | null };

  const match = description.match(AI_HANDOFF_REGEX) ?? description.match(LEGACY_AI_HANDOFF_REGEX);
  if (!match) return { isAiHandoff: false, aiProjectId: null as number | null };

  return {
    isAiHandoff: true,
    aiProjectId: Number(match[1]),
  };
}

export function pddHandoffStorageKey(projectId: number | string) {
  return `pdd_handoff_${projectId}`;
}
