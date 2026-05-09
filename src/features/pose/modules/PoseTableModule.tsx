import React, { useMemo } from 'react';
import { PoseData } from '../core/pose-data';
import TableRenderer from '@common/components/ui/react-web/common/TableRenderer';
import { Div, InputCheckbox, Select } from '@common/bridges/UIBridge';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '@common/types/analysis-module';

interface PoseTableSettingsData {
    selectedToolKey: string;
    visibility?: Record<string, boolean>;
    // 기존 설정을 유지하기 위한 필드들 (선택적)
    show_L_ARM?: boolean;
    show_R_ARM?: boolean;
    show_L_LEG?: boolean;
    show_R_LEG?: boolean;
    show_BODY?: boolean;
    show_HEAD?: boolean;
    [key: string]: any;
}

/**
 * 모듈의 기본 설정값
 */
const defaultSettings: PoseTableSettingsData = {
    selectedToolKey: "angle",
    show_L_ARM: true,
    show_R_ARM: true,
    show_L_LEG: true,
    show_R_LEG: true,
    show_BODY: true,
    show_HEAD: true,
    visibility: {},
};

/**
 * 출력(View) 컴포넌트: 데이터 테이블을 렌더링합니다.
 */
export const PoseTableView: React.FC<AnalysisViewProps<PoseData, PoseTableSettingsData>> = ({ data, currentFrame, settings }) => {
    // 데이터 계산 및 현재 프레임 값 추출 로직
    const currentFrameData = useMemo(() => {
        if (!data) return null;

        const processedData = data.getAnalysisResult(settings.selectedToolKey);

        if (!processedData) return null;

        const ret: Record<string, string | number> = {};
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
        <Div className="viewer_container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Div className="table-content-area" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                <TableRenderer data={currentFrameData} />
            </Div>
        </Div>
    );
};

/**
 * 설정(Settings) 컴포넌트: 분석 도구 선택 UI를 담당합니다.
 */
export const PoseTableSettings: React.FC<AnalysisSettingsProps<PoseData, PoseTableSettingsData>> = ({ settings, onSettingsChange, data }) => {
    const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSettingsChange({ ...settings, selectedToolKey: e.target.value });
    };

    // 현재 도구가 출력하는 실제 데이터 키들을 추출합니다.
    const availableKeys = useMemo(() => {
        const calculatedData = data?.getAnalysisResult(settings.selectedToolKey);
        return calculatedData ? Object.keys(calculatedData) : [];
    }, [data, settings.selectedToolKey]);

    return (
        <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
            <Div>
                <label style={{ marginRight: '10px' }}>
                    <strong>도구</strong>:
                </label>

                <Select
                    value={settings.selectedToolKey}
                    onChange={handleToolChange}
                    options={[
                        { label: "관절 각도", value: "angle"},
                        { label: "관절 이동 속도", value: "velocity"},
                        { label: "관절 회전 속도", value: "angle-velocity"},
                        { label: "관절 높이", value: "height"},
                        { label: "지면 반력", value: "grf"},

                    ]}
                />
            </Div>

            {/* 행 선택(가시성) 설정 영역 */}
            <Div>
                <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>표시할 데이터 선택</h4>
                <Div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableKeys.map((key) => {
                        const isVisible = settings.visibility?.[key] !== false;
                        return (
                            <InputCheckbox
                                key={key}
                                label={key}
                                checked={isVisible}
                                onChange={() => {
                                    const newVisibility = { ... (settings.visibility || {}) };
                                    newVisibility[key] = !isVisible;
                                    onSettingsChange({ ...settings, visibility: newVisibility });
                                }}
                            />
                        );
                    })}
                </Div>
            </Div>
        </Div>
    );
};

export const PoseTableModule: AnalysisModule<PoseData, PoseTableSettingsData> = {
    id: 'pose-table',
    title: '자세 정보 표',
    View: PoseTableView,
    Settings: PoseTableSettings,
    defaultSettings
};

export default PoseTableModule;