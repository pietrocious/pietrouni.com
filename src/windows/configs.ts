import type { WindowConfig } from '../types';
import { portfolioWindowConfigs } from './portfolio-configs';
import { gameWindowConfigs } from './game-configs';
import { labWindowConfigs } from './lab-configs';
import { systemWindowConfigs } from './system-configs';

export const windowConfigs: Record<string, WindowConfig> = {
  ...portfolioWindowConfigs,
  ...gameWindowConfigs,
  ...labWindowConfigs,
  ...systemWindowConfigs,
};

