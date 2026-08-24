import { createRoofBayProject, serializeRoofBayProject } from './interchange/roofBayProject.js';
import { validateRoofBayCodeDerivedActivation } from './interchange/roofBayCodeDerivedActivation.js';

const root = document.querySelector('[data-roof-bay-app]');

function download(text, filename) {
  const blob = new Blob([text], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildProject() {
  const model = window.__FT_ROOF_BAY_MODEL__;
  const windProjectInputAcceptance = window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__ ?? null;
  const windPressureContextAcceptance = window.__FT_WIND_PRESSURE_CONTEXT_ACCEPTANCE__ ?? null;
  if (!root || !model || !windPressureContextAcceptance) return null;

  const sectionSelect = root.querySelector('[data-rb-section]');
  const fySelect = root.querySelector('[data-rb-fy]');
  const factorInput = root.querySelector('[data-rb-factor]');
  const project = createRoofBayProject({
    projectId:`roof-bay-${Date.now()}`,
    projectName:'FutolTech Roof Bay M3 pressure-context project',
    sectionId:sectionSelect?.value,
    rafterSpacingM:model.inputs.rafterSpacingM,
    roofSlopeLengthM:model.inputs.roofSlopeLengthM,
    maxPurlinSpacingM:model.inputs.maxPurlinSpacingM,
    layoutMode:model.geometry.layoutMode,
    purlinStationsM:model.geometry.layoutMode === 'custom-stations' ? model.geometry.stationsM : null,
    slopeDeg:model.inputs.slopeDeg,
    orientationDeg:model.inputs.orientationDeg,
    elasticModulusMPa:200000,
    yieldStrengthMPa:Number(fySelect?.value || 250),
    densityKgM3:7850,
    mode:model.inputs.mode,
    deadLoadKPa:model.inputs.deadLoadKPa,
    roofLiveLoadKPa:model.inputs.roofLiveLoadKPa,
    windPressureKPa:model.inputs.windPressureKPa,
    windSense:model.inputs.windSense,
    loadFactor:Number(factorInput?.value || 1),
    windProjectInputAcceptance,
    windPressureContextAcceptance
  });

  const activation = window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__ ?? null;
  if (activation) {
    validateRoofBayCodeDerivedActivation(activation, project);
    project.codeDerivedActivation = JSON.parse(JSON.stringify(activation));
  }
  return project;
}

if (root) {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-rb-export-project]') : null;
    if (!target || !root.contains(target) || !window.__FT_WIND_PRESSURE_CONTEXT_ACCEPTANCE__) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const project = buildProject();
    if (!project) return;
    window.__FT_LAST_ROOF_BAY_PROJECT__ = project;
    download(serializeRoofBayProject(project), `futoltech-roof-bay-project-${Date.now()}.json`);
    window.dispatchEvent(new CustomEvent('ft-roof-bay-pressure-context-project-exported', { detail:{ project } }));
  }, { capture:true });

  window.__FT_ROOF_BAY_PRESSURE_CONTEXT_PROJECT_EXPORT__ = {
    mounted:true,
    buildProject
  };
}