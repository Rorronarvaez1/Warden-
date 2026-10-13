export * from './types';
export { domainSchema } from './schemas';
export { assertSubjectDomain } from './target';
export { analysisModules } from './registry';
export { runRiskAnalysis } from './runner';
export { emailModule } from './email/analyzer';
export { emailEvidenceSchema, type EmailEvidence } from './email/schemas';
export { credentialsModule } from './credentials/analyzer';
export { credentialsEvidenceSchema, type CredentialsEvidence } from './credentials/schemas';
