import React, { useMemo } from 'react';
import DataTable from '../../../common/components/DataTable';

/**
 * 모듈의 기본 설정값
 */
const defaultSettings = {
    selectedToolKey: "angle",
    show_L_ARM: true,
    show_R_ARM: true,
    show_L_LEG: true,
    show_R_LEG: true,
    show_BODY: true,
    show_HEAD: true,
};

/**
 * 출력(View) 컴포넌트: 데이터 테이블을 렌더링합니다.
 */
export const PoseTableView = ({ data, currentFrame, settings }) => {
    // 데이터 계산 및 현재 프레임 값 추출 로직
    const currentFrameData = useMemo(() => {
        if (!data || !data.analysisTools) return null;

        const analysisTools = data.analysisTools;
        const currentTool = analysisTools[settings.selectedToolKey];
        const processedData = currentTool ? currentTool.calc(data) : data;

        if (!processedData) return null;

        const ret = {};
        for (const key of Object.keys(processedData)) {
            // 설정에서 해당 키의 가시성이 false인 경우 건너뜀
            if (settings.visibility && settings.visibility[key] === false) continue;

            const values = processedData[key];
            if (Array.isArray(values) && values[currentFrame] !== undefined) {
                const val = values[currentFrame];
                // 숫자인 경우 소수점 2자리까지 표시
                ret[key] = typeof val === 'number' ? val.toFixed(2) : val;
            }
        }
        return Object.keys(ret).length > 0 ? ret : null;
    }, [data, settings, currentFrame]);

    return (
        <div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                <DataTable data={currentFrameData} />
            </div>
        </div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 UI를 담당합니다.
 */
export const PoseTableSettings = ({ settings, onSettingsChange, data }) => {
    const handleToolChange = (e) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const currentTool = data?.analysisTools?.[settings.selectedToolKey];
    const availableKeys = useMemo(() => (currentTool ? Object.keys(currentTool.calc(data)) : []), [data, currentTool]);

    return (
        <div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <div>
                <label style={{ marginRight: '10px' }}>
                    <strong>도구</strong>:
                </label>
                <select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d9e6' }}
                >
                    <option value="angle">관절 각도</option>
                    <option value="velocity">관절 이동 속도</option>
                    <option value="angle-velocity">관절 회전 속도</option>
                    <option value="height">관절 높이</option>
                </select>
            </div>

            {/* 행 선택(가시성) 설정 영역 */}
            <div>
                <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>표시할 데이터 선택</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableKeys.map((key) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.visibility?.[key] !== false}
                                onChange={(e) => {
                                    const newVisibility = { ... (settings.visibility || {}) };
                                    newVisibility[key] = e.target.checked;
                                    onSettingsChange({ ...settings, visibility: newVisibility });
                                }}
                            />
                            {key}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const PoseTableModule = {
    id: 'pose-table',
    title: '자세 정보 표',
    View: PoseTableView,
    Settings: PoseTableSettings,
    defaultSettings
};

export default PoseTableModule;