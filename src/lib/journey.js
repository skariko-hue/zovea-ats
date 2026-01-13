export const JOURNEY_STAGE_LABELS_NL = {
  FIRST_INTERVIEW: '1e gesprek',
  TRIAL_DAY: 'Meeloopdag',
  FINAL_OFFER: 'Laatste aanbod',
  PLACED: 'Geplaatst',
  REJECTED: 'Afgewezen',
  WITHDRAWN: 'Teruggetrokken'
};

export function stageLabelNl(stage) {
  return JOURNEY_STAGE_LABELS_NL[stage] || stage;
}

