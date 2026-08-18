const EVENT_STATES = {
  serviceability: {
    phase: 'SERVICEABILITY LIMIT',
    mode: 'elastic-serviceability',
    severity: 'serviceability',
    physicalMeaning: 'Elastic deformation has reached the selected serviceability criterion.',
    visual: 'elastic-deflection',
    boundary: 'This is a usability limit, not material failure.'
  },
  'working-reference': {
    phase: 'WORKING / ALLOWABLE REFERENCE',
    mode: 'working-reference',
    severity: 'reference',
    physicalMeaning: 'Elastic stress has reached the selected working or allowable material reference.',
    visual: 'stress-reference',
    boundary: 'No damage law is inferred merely from crossing a working-stress reference.'
  },
  'first-yield': {
    phase: 'FIRST YIELD',
    mode: 'steel-first-yield',
    severity: 'yield',
    physicalMeaning: 'The most highly stressed elastic fibre reaches the selected steel Fy reference.',
    visual: 'yield-onset',
    boundary: 'Yield onset is not fracture. Redistribution and residual deformation require the Steel Yield model.'
  },
  'gross-yield-screen': {
    phase: 'GROSS FIRST-YIELD SCREEN',
    mode: 'gross-yield-screen',
    severity: 'screening',
    physicalMeaning: 'Gross-section elastic stress reaches the selected Fy reference.',
    visual: 'yield-onset',
    boundary: 'Local/distortional/LTB/torsional or connection/restraint failure may govern earlier.'
  },
  'rupture-reference': {
    phase: 'PUBLISHED RUPTURE REFERENCE',
    mode: 'timber-rupture-reference',
    severity: 'rupture-reference',
    physicalMeaning: 'Elastic scaling reaches the selected published ultimate bending reference.',
    visual: 'rupture-plane-reference',
    boundary: 'This does not predict the exact specimen crack, fracture plane, or fracture time.'
  },
  'governing-capacity': {
    phase: 'GOVERNING COLUMN LIMIT',
    mode: 'column-governing-limit',
    severity: 'instability-limit',
    physicalMeaning: 'The implemented column model reaches its earliest governing capacity limit.',
    visual: 'global-instability-onset',
    boundary: 'The displayed buckling shape is an idealized mode-shape cue, not a post-buckled deformation path.'
  },
  'compression-reference': {
    phase: 'COMPRESSION-STRESS REFERENCE',
    mode: 'compression-reference',
    severity: 'reference',
    physicalMeaning: 'Amplified compression stress reaches the selected compression/yield reference.',
    visual: 'compression-stress-reference',
    boundary: 'Crushing, splitting and post-yield degradation are not inferred.'
  },
  'euler-reference': {
    phase: 'ELASTIC EULER REFERENCE',
    mode: 'euler-reference',
    severity: 'theoretical',
    physicalMeaning: 'The ideal elastic Euler critical-load reference is reached for the selected effective length and weak axis.',
    visual: 'global-instability-onset',
    boundary: 'This is a theoretical instability reference, not a nonlinear post-buckling solution.'
  }
};

export function failurePhysicsStateForEvent(eventId) {
  if (!eventId) return {
    phase: 'ELASTIC RESPONSE',
    mode: 'elastic',
    severity: 'elastic',
    physicalMeaning: 'No stored adverse event has been crossed.',
    visual: 'elastic-deflection',
    boundary: 'Failure Physics v1 only visualizes events already produced by the verified governing-limit timeline.'
  };
  return EVENT_STATES[eventId] ?? {
    phase: 'MODEL EVENT',
    mode: 'model-event',
    severity: 'reference',
    physicalMeaning: 'A stored solver event has been crossed.',
    visual: 'stress-reference',
    boundary: 'No additional failure mechanism is inferred for this event.'
  };
}

export function currentFailurePhysicsState(events, currentLoadKN) {
  if (!Array.isArray(events)) throw new Error('Failure Physics requires a governing-event array.');
  if (!Number.isFinite(currentLoadKN) || currentLoadKN < 0) throw new Error('Current load must be zero or positive.');
  const crossed = events
    .filter((event) => Number.isFinite(event.loadKN) && currentLoadKN + 1e-9 >= event.loadKN)
    .sort((a, b) => a.loadKN - b.loadKN);
  const governing = crossed.at(-1) ?? null;
  return {
    event: governing,
    ...failurePhysicsStateForEvent(governing?.id ?? null),
    crossedEventCount: crossed.length
  };
}

export function failureVisualDefinition(state, { mode = 'beam' } = {}) {
  const visual = state?.visual ?? 'elastic-deflection';
  if (mode === 'column') {
    if (visual === 'global-instability-onset') {
      return {
        kind: 'column-mode',
        title: 'IDEALIZED GLOBAL INSTABILITY MODE',
        disclaimer: 'Schematic amplitude only · not a post-buckling prediction',
        path: 'M 160 250 C 245 225, 245 95, 160 70'
      };
    }
    return {
      kind: visual === 'compression-stress-reference' ? 'column-compression-reference' : 'column-elastic',
      title: state?.phase ?? 'ELASTIC COLUMN RESPONSE',
      disclaimer: visual === 'compression-stress-reference'
        ? 'Stress-reference cue only · no crushing or splitting inferred'
        : 'Straight elastic response cue · no instability event crossed',
      path: 'M 160 250 L 160 70'
    };
  }
  if (visual === 'yield-onset') {
    return {
      kind: 'beam-yield',
      title: 'FIRST-YIELD ONSET AT EXTREME FIBRE',
      disclaimer: 'Elastic stress reference · not fracture',
      path: 'M 80 170 Q 240 205 400 170'
    };
  }
  if (visual === 'rupture-plane-reference') {
    return {
      kind: 'beam-rupture-reference',
      title: 'PUBLISHED RUPTURE REFERENCE REACHED',
      disclaimer: 'Reference plane marker only · no crack path predicted',
      path: 'M 80 170 Q 240 215 400 170'
    };
  }
  return {
    kind: 'beam-elastic',
    title: state?.phase ?? 'ELASTIC RESPONSE',
    disclaimer: 'Schematic response cue linked to stored solver event',
    path: 'M 80 170 Q 240 190 400 170'
  };
}
