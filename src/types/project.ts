import { LedgyDocument } from './profile';

export interface ProjectDocument extends LedgyDocument {
    type: 'project';
    name: string;
    description?: string;
    profileId: string; // Redundant but good for isolation checks
}
