import { TrackBallData } from '../core/track-ball-data';
import { TableModuleBuilder } from '@common/module/table/TableModule.tsx';
import { TrackBallTablePlugin } from '../plugin/TrackBallTablePlugin.tsx';

export const TrackBallTableModule = new TableModuleBuilder<TrackBallData>()
    .addPlugin(new TrackBallTablePlugin())
    .build('track-ball-table', '표');

export default TrackBallTableModule;