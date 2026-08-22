export const WIND_CODE_PROFILE_STATUS = Object.freeze({
  REFERENCE_IDENTIFIED_RULES_UNIMPLEMENTED: 'REFERENCE_IDENTIFIED_RULES_UNIMPLEMENTED',
  USER_DEFINED: 'USER_DEFINED'
});

export const WIND_CODE_PROFILES = Object.freeze([
  Object.freeze({
    id: 'ph-nscp-2015-v1-7e-2p',
    label: 'NSCP 2015 · Volume 1 · 7th Edition · 2nd Printing',
    jurisdiction: 'Philippines',
    publisher: 'Association of Structural Engineers of the Philippines, Inc. (ASEP)',
    title: 'National Structural Code of the Philippines',
    volume: 'Volume 1 · Buildings, Towers and Other Vertical Structures',
    edition: '7th Edition',
    year: 2015,
    printing: '2nd Printing',
    status: WIND_CODE_PROFILE_STATUS.REFERENCE_IDENTIFIED_RULES_UNIMPLEMENTED,
    evidence: Object.freeze([
      Object.freeze({
        id: 'ASEP-PUBLISHER-CONTEXT-2026',
        type: 'publisher-context',
        organization: 'Association of Structural Engineers of the Philippines, Inc. (ASEP)',
        url: 'https://aseponline.org/about/',
        claim: 'ASEP identifies the National Structural Code of the Philippines among its publications and describes its code-and-standards role.'
      }),
      Object.freeze({
        id: 'DPWH-TOR-NSCP2015-V1-7E-2P',
        type: 'government-project-reference',
        organization: 'Department of Public Works and Highways (DPWH)',
        url: 'https://www.dpwh.gov.ph/dpwh/sites/default/files/webform/consultancy/advertisement/tor_22csoe01_-_22csoe13.pdf',
        claim: 'A DPWH structural-design TOR lists NSCP 2015, Volume 1, 7th Edition, 2nd Printing among its standards and references and separately lists wind-design input categories.'
      }),
      Object.freeze({
        id: 'ASEP-WORKSHOP-NSCP2015-2025',
        type: 'professional-practice-context',
        organization: 'Association of Structural Engineers of the Philippines, Inc. (ASEP)',
        url: 'https://aseponline.org/news-events/page/4/',
        claim: 'ASEP advertised a 2025 structural-design workshop that explicitly included NSCP 2015 among the standards/practices covered.'
      })
    ]),
    implementationBoundary: 'Code identity and public provenance only. Wind maps, coefficients, zone geometry, equations, load combinations and clause-level rules are not implemented by this profile.'
  }),
  Object.freeze({
    id: 'user-defined-wind-basis',
    label: 'User-defined / research wind basis',
    jurisdiction: 'User supplied',
    publisher: null,
    title: 'User-defined wind basis',
    volume: null,
    edition: null,
    year: null,
    printing: null,
    status: WIND_CODE_PROFILE_STATUS.USER_DEFINED,
    evidence: Object.freeze([]),
    implementationBoundary: 'No governing-code claim. Every input and source must be supplied by the user or project record.'
  })
]);

export function windCodeProfileById(id) {
  return WIND_CODE_PROFILES.find((profile) => profile.id === id) ?? null;
}
