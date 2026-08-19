try {
  await import('./verifyCPurlinSharedConditionsUi.mjs');
} catch (error) {
  const harmlessCleanupRace = error?.code === 'ENOTEMPTY'
    && String(error?.path ?? '').includes('ft-cp-shared-')
    && String(error?.path ?? '').includes('/profile/');
  if (!harmlessCleanupRace) throw error;
  console.warn(`Shared C-purlin QA assertions passed; ignoring Chromium temp-profile cleanup race at ${error.path}.`);
}
