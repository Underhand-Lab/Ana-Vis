import React, { useState, useEffect, useMemo } from 'react';
import TableRenderer from '../../../common/components/ui/TableRenderer';
import { Div, InputCheckbox, Select } from '../../../common/components/ui/UI';

const defaultSettings = {
    selectedToolKey: "default",
    visibility: {}
};

/**
 * 출력(View) 컴포넌트
 */
export const TrackBallTableView = ({ data, currentFrame, settings }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentFrameData = useMemo(() => {

        if (!data || !data.analysisTools) return null;
        const analysisTools = data.analysisTools;
        const tool = (analysisTools && analysisTools[settings.selectedToolKey]) || null;

        // 도구가 없는 경우(default) data에서 직접 현재 프레임 데이터를 가져옵니다.
        // 이를 통해 초기 데이터 입력 시 바로 렌더링되도록 합니다.
        const processedData = tool ? tool.calc(data, currentFrame) : (data.getFrameData ? data.getFrameData(currentFrame) : data[currentFrame]);

        if (!processedData) return null;

        const ret = {};
        for (const key of Object.keys(processedData)) {
            // 설정에서 해당 키의 가시성이 false인 경우 건너뜀
            if (settings.visibility && settings.visibility[key] === false) continue;
            
            const val = processedData[key];
            // 숫자인 경우 소수점 2자리까지 표시 (PoseTable과 동일 사양)
            ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
        }
        
        return Object.keys(ret).length > 0 ? ret : null;
    }, [data, currentFrame, settings]);

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
    };

    return (
        <Div className="viewer_container" style={containerStyle}>
            <Div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '5px' : 'var(--table-padding, 10px)' }}>
                <TableRenderer data={currentFrameData} isMobile={isMobile} />
            </Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트
 */
export const TrackBallTableSettings = ({ settings, onSettingsChange, data, currentFrame }) => {
    const handleToolChange = (e) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const availableKeys = useMemo(() => {
        const tool = data?.analysisTools?.[settings.selectedToolKey];
        // 초기 렌더링 시 도구가 선택되지 않았더라도 데이터에서 키를 추출하여 표시 설정 UI를 활성화합니다.
        const sampleData = tool ? tool.calc(data, currentFrame || 0) : (data?.getFrameData ? data.getFrameData(currentFrame || 0) : null);
        return sampleData ? Object.keys(sampleData) : [];
    }, [data, settings.selectedToolKey, currentFrame]);

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
                            onChange={(e) => {
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

export const TrackBallTableModule = {
    id: 'track-ball-table',
    title: '표',
    View: TrackBallTableView,
    Settings: TrackBallTableSettings,
    defaultSettings
};

export default TrackBallTableModule;