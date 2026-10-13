import { credentialsModule } from './credentials/analyzer';
import { emailModule } from './email/analyzer';
import type { AnalysisModule, AnalysisModuleKey } from './types';

export const analysisModules: ReadonlyMap<AnalysisModuleKey, AnalysisModule> = new Map(
  [emailModule, credentialsModule].map((module) => [module.key, module]),
);
