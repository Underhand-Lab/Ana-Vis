import { SkeletonSettings } from './hooks/usePoseFrame';
import { GRFSettings } from './hooks/useGRFFrame';

// Combined settings for usePoseVisualize
export interface PoseSettings extends SkeletonSettings, GRFSettings {
    showBackground: boolean;
}