import { PoseVideoPlugin } from '../plugin/PoseVideoPlugin';
import { VideoModuleBuilder } from '@common/module/video/VideoModule.tsx';

export const PoseVideoModule = new VideoModuleBuilder()
    .addPlugin(new PoseVideoPlugin())
    .build('pose-video', '자세 동영상');

export default PoseVideoModule;