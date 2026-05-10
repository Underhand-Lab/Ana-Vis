import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import { TrackBallData } from '../core/track-ball-data'; // TrackBallData 타입 임포트

import TableRenderer from '@common/components/ui/react-web/common/TableRenderer';
import { Div, InputCheckbox, Select } from '@common/bridges/UIBridge';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '@common/types/analysis-module';

interface TrackBallTableSettingsData {
    selectedToolKey: string;
    visibility?: Record<string, boolean>;
    [key: string]: any; // Allow for other potential settings
}

const defaultSettings: TrackBallTableSettingsData = {
    selectedToolKey: "default",
    visibility: {}
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBallTableView: React.FC<AnalysisViewProps<TrackBallData, TrackBallTableSettingsData>> = ({ data, currentFrame, settings }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentFrameData = useMemo(() => {

        if (!data) return null;

        const processedData = data.getAnalysisResult(settings.selectedToolKey, currentFrame);
        if (!processedData) return null;

        const ret: Record<string, string | number> = {};
        for (const key of Object.keys(processedData)) {
            // 설정에서 해당 키의 가시성이 false인 경우 건너뜀
            if (settings.visibility && settings.visibility[key] === false) continue;

            const val = processedData[key];
            // 유효한 값인 경우에만 추가하고 숫자는 소수점 2자리 포맷팅
            if (val !== undefined && val !== null) {
                ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
            }
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
export const TrackBallTableSettings: React.FC<AnalysisSettingsProps<TrackBallData, TrackBallTableSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const availableKeys = useMemo(() => {
        const sampleData = data?.getAnalysisResult(settings.selectedToolKey, 0);
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

export const TrackBallTableModule: AnalysisModule<TrackBallData, TrackBallTableSettingsData> = {
    id: 'track-ball-table',
    title: '표',
    View: TrackBallTableView,
    Settings: TrackBallTableSettings,
    defaultSettings
};
export default TrackBallTableModule;