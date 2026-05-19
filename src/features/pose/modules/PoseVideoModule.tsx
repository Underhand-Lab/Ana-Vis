import { PoseVideoPlugin } from '../plugin/PoseVideoPlugin';
import { VideoModuleBuilder } from '@/features/cv-val/modules/VideoModule';

export const PoseVideoModule = new VideoModuleBuilder()
    .addPlugin(new PoseVideoPlugin())
    .build('pose-video', '자세 동영상');

export default PoseVideoModule;