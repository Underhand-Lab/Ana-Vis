import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule } from '@common/types/analysis-module.ts';
import { Div } from '@common/bridges/UIBridge.ts';
import TableRenderer from '@common/components/ui/react-web/common/TableRenderer';

/**
 * TableModule에서 사용될 데이터의 공통 인터페이스
 */
export interface TableModuleData {
    getAnalysisResult?(toolKey: string, frameIdx: number): Record<string, any> | undefined;
    analysisTools?: Record<string, any>;
}

/**
 * TableModule을 위한 플러그인 추상 클래스
 */
export abstract class TableModulePlugin<TData extends TableModuleData, TSettings, TContext = any> {
    abstract id: string;
    abstract title: string;
    abstract defaultSettings: TSettings;

    /**
     * 훅을 사용하거나 상태를 관리하기 위한 컨텍스트 정의
     */
    abstract usePluginContext(data: TData | null, settings: TSettings): TContext;

    /**
     * 특정 프레임의 표에 표시할 행 데이터(Key-Value)를 반환합니다.
     */
    abstract getRowData(data: TData, frameIdx: number, settings: TSettings, context: TContext): Record<string, string | number> | null;
    
    /**
     * 설정 UI 컴포넌트를 반환합니다.
     */
    abstract getSettingComponent(props: AnalysisSettingsProps<TData, TSettings>): React.ReactNode;
}

/**
 * 공통 표 모듈 생성 함수
 */
export function createTableModule<TData extends TableModuleData>(
    plugins: TableModulePlugin<TData, any, any>[],
    moduleId: string,
    moduleTitle: string
): AnalysisModule<TData, Record<string, any>> {
    
    const TableView: React.FC<AnalysisViewProps<TData, Record<string, any>>> = ({ data, currentFrame, settings }) => {
        const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

        useEffect(() => {
            const handleResize = () => setIsMobile(window.innerWidth < 768);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        const contexts = plugins.map(p => 
            p.usePluginContext(data, settings[p.id] ?? p.defaultSettings)
        );

        const mergedFrameData = useMemo(() => {
            if (!data) return null;
            let result: Record<string, string | number> = {};
            
            plugins.forEach((p, i) => {
                const rowData = p.getRowData(data, currentFrame, settings[p.id] ?? p.defaultSettings, contexts[i]);
                if (rowData) {
                    result = { ...result, ...rowData };
                }
            });
            
            return Object.keys(result).length > 0 ? result : null;
        }, [data, currentFrame, settings, contexts]);

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
                    <TableRenderer data={mergedFrameData || {}} />
                </Div>
            </Div>
        );
    };

    const TableSettings: React.FC<AnalysisSettingsProps<TData, Record<string, any>>> = (props) => {
        const { settings, onSettingsChange } = props;

        return (
            <Div className="flex-view" style={{ flexDirection: 'column', gap: '15px' }}>
                {plugins.map(p => (
                    <React.Fragment key={p.id}>
                        <Div style={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', marginTop: '10px', paddingBottom: '3px' }}>
                            {p.title}
                        </Div>
                        {p.getSettingComponent({
                            ...props,
                            settings: settings[p.id] ?? p.defaultSettings,
                            onSettingsChange: (newVal: any) => onSettingsChange({
                                ...settings,
                                [p.id]: newVal
                            })
                        } as any)}
                    </React.Fragment>
                ))}
            </Div>
        );
    };

    const defaultSettings = plugins.reduce((acc, p) => ({
        ...acc,
        [p.id]: p.defaultSettings
    }), {});

    return {
        id: moduleId,
        title: moduleTitle,
        View: TableView,
        Settings: TableSettings,
        defaultSettings
    };
}

/**
 * 여러 플러그인을 조립하기 위한 빌더 클래스
 */
export class TableModuleBuilder<TData extends TableModuleData> {
    private plugins: TableModulePlugin<TData, any, any>[] = [];

    addPlugin<TSettings, TContext>(plugin: TableModulePlugin<TData, TSettings, TContext>) {
        this.plugins.push(plugin);
        return this;
    }

    build(id: string, title: string): AnalysisModule<TData, Record<string, any>> {
        return createTableModule(this.plugins, id, title);
    }
}
