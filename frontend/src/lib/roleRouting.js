export const ROLES = {
  USER: 'user',
  NUTRITIONIST: 'nutricionista',
  ADMIN: 'admin'
};

const KNOWN_ROLES = new Set(Object.values(ROLES));

const INITIAL_SECTION_BY_ROLE = {
  [ROLES.USER]: 'collaboratorPortal',
  [ROLES.NUTRITIONIST]: 'internalManagement',
  [ROLES.ADMIN]: 'internalManagement'
};

const INITIAL_PATH_BY_ROLE = {
  [ROLES.USER]: '/portal-colaborador',
  [ROLES.NUTRITIONIST]: '/gestion-interna',
  [ROLES.ADMIN]: '/gestion-interna'
};

const BASE_SECTIONS_BY_ROLE = {
  [ROLES.USER]: new Set(['collaboratorPortal', 'declaration', 'policies']),
  [ROLES.NUTRITIONIST]: new Set(['internalManagement', 'declaration', 'policies', 'nutritionModules', 'certifications']),
  [ROLES.ADMIN]: new Set([
    'internalManagement',
    'upload',
    'history',
    'charts',
    'customerNonconformities',
    'profile',
    'tutorial',
    'rules',
    'adminUsers',
    'declaration',
    'policies',
    'declarationHistory',
    'adminHealthDeclarations',
    'nutritionModules',
    'certifications'
  ])
};

export function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return KNOWN_ROLES.has(normalized) ? normalized : ROLES.USER;
}

export function isKnownRole(role) {
  return KNOWN_ROLES.has(String(role || '').trim().toLowerCase());
}

export function getInitialPathForRole(role) {
  return INITIAL_PATH_BY_ROLE[normalizeRole(role)];
}

export function getInitialSectionForRole(role) {
  return INITIAL_SECTION_BY_ROLE[normalizeRole(role)];
}

export function getFallbackPathForRole(role) {
  return getInitialPathForRole(role);
}

export function getFallbackSectionForRole(role) {
  return getInitialSectionForRole(role);
}

export function getAllowedSectionsForRole(role) {
  return new Set(BASE_SECTIONS_BY_ROLE[normalizeRole(role)]);
}

export function isSectionAllowedForRole(section, role) {
  return getAllowedSectionsForRole(role).has(section);
}
