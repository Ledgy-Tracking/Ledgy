import { LedgyDocument } from './profile';

export interface WidgetPosition {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface WidgetConfig {
    id: string;
    nodeId?: string; // Link to source computation node
    type: 'chart' | 'trend' | 'text';
    title: string;
    position: WidgetPosition;
    data?: any;
}

export interface DashboardLayout extends LedgyDocument {
    type: 'dashboard';
    profileId: string;
    dashboardId: string;
    widgets: WidgetConfig[];
    widgets_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    layout: {
        columns: number;
        rows: number;
    };
}
