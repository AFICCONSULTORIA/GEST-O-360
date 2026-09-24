import { seedDemoDataForModule } from './demoManager';

export const seedDemoInstitution = async (institutionId: string) => {
  return seedDemoDataForModule('all', { institutionId });
};
