import { TrackBatVideoPlugin } from '../plugin/TrackBatVideoPlugin.tsx';
import { VideoModuleBuilder } from '@/common/module/VideoModule.tsx';

export const TrackBatVideoModule = new VideoModuleBuilder()
    .addPlugin(new TrackBatVideoPlugin())
    .build('track-bat-video', '동영상');

export default TrackBatVideoModule;