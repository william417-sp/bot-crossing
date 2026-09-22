/**
 * 3D World module - Tony Stark garage HQ visualization
 * Exports all 3D rendering components
 */

export {
  createWorld3D,
  resizeWorld3D,
  disposeWorld3D,
  type World3DContext,
} from './scene';

export {
  createGarage,
  updateGarage,
  getSiteWorldPosition,
  type GarageElements,
} from './garage3d';

export {
  createAgent3D,
  updateAgent3D,
  setAgentSelected,
  getAgentWorldPosition,
  type Agent3D,
} from './agents3d';
