// Per-pillar self-reflection content for the 13 Pillars survey.
// Indexed by pillar idx (0-12), then layer idx (0-6). Each cell is
//   { qdesc, none, survive, build, scale } — all strings.
import p01 from './01-water.js';
import p02 from './02-food.js';
import p03 from './03-shelter.js';
import p04 from './04-energy.js';
import p05 from './05-medicine.js';
import p06 from './06-communication.js';
import p07 from './07-manufacturing.js';
import p08 from './08-security.js';
import p09 from './09-transportation.js';
import p10 from './10-trade.js';
import p11 from './11-governance.js';
import p12 from './12-knowledge.js';
import p13 from './13-culture.js';

export const SURVEY_CONTENT = [
  p01, p02, p03, p04, p05, p06, p07,
  p08, p09, p10, p11, p12, p13,
];
