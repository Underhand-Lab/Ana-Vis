import { CVValData } from '@packages/cv-val/data/cvval-data';
import { IAnalysisTool } from '@packages/cv-val/data/cvval-types';
import featureName from '../constant';
import { TrackBatData } from '../data/track-bat-data';

export class BatAnalysisTool implements IAnalysisTool {
    public name: string = 'bat-analysis-tool';

    private data: CVValData | null = null;

    setData(data: CVValData): void {
        this.data = data;
    }

    getResult(idx: number): Record<string, number | null> | null {
        if (!this.data || !this.data.exist(featureName)) return null;

        const data = this.data.get(featureName) as TrackBatData;
        const bat = data.getSelectedBatAt(idx);

        if (!bat) {
            return {
                'x': null,
                'y': null,
                'width': null,
                'height': null,
                'confidence': null,
            };
        }

        const [x, y, width, height] = bat.bbox;
        return {
            'x': x,
            'y': y,
            'width': width,
            'height': height,
            'confidence': bat.confidence,
        };
    }

    getResults(): Record<string, (number | null)[]> | null {
        if (!this.data || !this.data.exist(featureName)) return null;

        const data = this.data.get(featureName) as TrackBatData;
        const results: Record<string, (number | null)[]> = {
            'x': [],
            'y': [],
            'width': [],
            'height': [],
            'confidence': [],
        };

        for (let i = 0; i < data.getFrameCnt(); i++) {
            const frame = this.getResult(i);
            results.x.push(frame?.x ?? null);
            results.y.push(frame?.y ?? null);
            results.width.push(frame?.width ?? null);
            results.height.push(frame?.height ?? null);
            results.confidence.push(frame?.confidence ?? null);
        }

        return results;
    }
}
