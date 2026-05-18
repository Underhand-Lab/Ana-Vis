import { VideoModulePlugin, VideoModuleBuilder } from '../../../../common/module/video/VideoModule.tsx';
import { TrackBallVideoPlugin } from '../plugin/TrackBallVideoPlugin.tsx';

export const TrackBallVideoModule = new VideoModuleBuilder()
    .addPlugin(new TrackBallVideoPlugin())
    .build('track-ball-video', '동영상');

export default TrackBallVideoModule;