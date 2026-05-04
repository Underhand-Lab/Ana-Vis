import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import TableRenderer from '../../../common/components/ui/react-web/common/TableRenderer';
import { Div, InputCheckbox, Select } from '../../../common/bridges/UIBridge';
import { TrackBallData } from '../../../lib/cv-val/track-ball/track-ball-data'; // TrackBallData 타입 임포트
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '../../../common/types/analysis';

interface TrackBallTableSettingsData {
    selectedToolKey: string;
    visibility?: Record<string, boolean>;
    [key: string]: any; // Allow for other potential settings
}

const defaultSettings: TrackBallTableSettingsData = {
    selectedToolKey: "default",
    visibility: {}
};

// AnalysisTool 인터페이스 정의 (analysis.ts에서 가져올 수도 있음)
interface AnalysisTool {
    calc: (data: TrackBallData, frame: number) => Record<string, any> | null | undefined;
}

// TrackBallData에 analysisTools 속성을 추가한 타입 정의
type TrackBallDataWithAnalysisTools = TrackBallData & {
    analysisTools?: Record<string, AnalysisTool>;
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBallTableView: React.FC<AnalysisViewProps<TrackBallDataWithAnalysisTools, TrackBallTableSettingsData>> = ({ data, currentFrame, settings }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentFrameData = useMemo(() => {

        if (!data) return null;

        const analysisTools = data.analysisTools;
        const tool: AnalysisTool | null = (analysisTools && analysisTools[settings.selectedToolKey]) || null;

        // 도구가 없는 경우(default) data에서 직접 현재 프레임 데이터를 가져옵니다.
        // data.getFrameData는 TrackBallData에 없는 메서드이므로, data.getSelectedBallAt을 사용하거나
        // data 자체를 직접 처리하는 로직으로 변경해야 합니다. 여기서는 data.getSelectedBallAt을 사용하도록 가정합니다.
        // 이를 통해 초기 데이터 입력 시 바로 렌더링되도록 합니다.
        const processedData: Record<string, any> | null | undefined = tool ? tool.calc(data, currentFrame) : data.getSelectedBallAt(currentFrame);

        if (!processedData) return null;

        const ret: Record<string, string | number> = {};
        for (const key of Object.keys(processedData)) {
            // 설정에서 해당 키의 가시성이 false인 경우 건너뜀
            if (settings.visibility && settings.visibility[key] === false) continue;

            const val = processedData[key];
            // 숫자인 경우 소수점 2자리까지 표시 (PoseTable과 동일 사양)
            ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
        }
        
        return Object.keys(ret).length > 0 ? ret : null;
    }, [data, currentFrame, settings]);

    const containerStyle: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
    };

    return (
        <Div className="viewer_container" style={containerStyle}>
            <Div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '5px' : 'var(--table-padding, 10px)' }}>
                <TableRenderer data={currentFrameData || {}} />
            </Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBallTableSettings: React.FC<AnalysisSettingsProps<TrackBallDataWithAnalysisTools, TrackBallTableSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const availableKeys = useMemo(() => {
        const tool = data?.analysisTools?.[settings.selectedToolKey];
        // 초기 렌더링 시 도구가 선택되지 않았더라도 데이터에서 키를 추출하여 표시 설정 UI를 활성화합니다. (data.getSelectedBallAt 사용)
        const sampleData = tool ? tool.calc(data as TrackBallData, 0) : (data?.getSelectedBallAt(0) || null);
        return sampleData ? Object.keys(sampleData) : [];
    }, [data, settings.selectedToolKey]);

    const toolOptions = useMemo(() => [
        { label: "기본 추적 데이터", value: "default" },
        ...(data?.analysisTools ? Object.keys(data.analysisTools).map(key => ({ 
            label: key, 
            value: key
        })) : [])
    ], [data]);

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Div>
                <label style={{ marginRight: '10px' }}>
                    <strong>도구</strong>:
                </label>
                <Select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    className="neumorphism-select"
                    options={toolOptions}
                />
            </Div>

            {/* 행 선택(가시성) 설정 영역 */}
            <Div>
                <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>표시할 데이터 선택</h4>
                <Div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableKeys.map((key) => (
                        <InputCheckbox
                            key={key}
                            label={key}
                            checked={settings.visibility?.[key] !== false}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newVisibility = { ... (settings.visibility || {}) };
                                newVisibility[key] = e.target.checked;
                                onSettingsChange({ ...settings, visibility: newVisibility });
                            }}
                        />
                    ))}
                </Div>
            </Div>
        </Div>
    );
};

export const TrackBallTableModule: AnalysisModule<TrackBallDataWithAnalysisTools, TrackBallTableSettingsData> = {
    id: 'track-ball-table',
    title: '표',
    View: TrackBallTableView,
    Settings: TrackBallTableSettings,
    defaultSettings
};
export default TrackBallTableModule;