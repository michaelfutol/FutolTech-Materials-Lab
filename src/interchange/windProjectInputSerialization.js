import { validateWindProjectInputAcceptance } from './windProjectInputAcceptance.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function serializeWindProjectInputAcceptance(record) {
  validateWindProjectInputAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindProjectInputAcceptance(text) {
  const parsed = JSON.parse(String(text));
  validateWindProjectInputAcceptance(parsed);
  return clone(parsed);
}
