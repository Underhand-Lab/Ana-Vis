import React, { useRef, useState, useCallback, useEffect } from 'react';
import CanvasRenderer, { CanvasRendererHandle }
    from "@/common/components/ui-brick/react-web/custom/CanvasRenderer";
import { Div, Button } from '@common/bridges/UIBridge.ts';
import { exportVideo } from '@common/utils/exportVideo';
import { InputCheckbox, Toggle } from '@common/bridges/UIBridge.ts';
import { AnalysisViewProps, AnalysisSettingsProps, AnalysisModule }
    from '@features/cv-val/types/analysis-module.ts';
import { useTranslation } from 'react-i18next';

/**
 * VideoModule을 위한 플러그인 추상 클래스
 */
export abstract class VideoModulePlugin<TSettings, TContext = any> {
    abstract id: string;
    abstract title: string;
    abstract defaultSettings: TSettings;
    locales?: Record<string, any>;

    /**
     * 오버레이 그리기에 필요한 상태나 훅을 관리합니다.
     * React Component 내부에서 호출되므로 훅을 사용할 수 있습니다.
     */
    abstract usePluginContext(data: any | null, settings: TSettings): TContext;

    /**
     * 배경 이미지 위에 오버레이를 그립니다.
     */
    abstract drawOverlay(ctx: CanvasRenderingContext2D, frameIdx: number, data: any, settings: TSettings, context: TContext): void;
    
    /**
     * 설정 UI 컴포넌트를 반환합니다.
     */
    abstract getSettingComponent(props: AnalysisSettingsProps<TSettings>): React.ReactNode;
}

/**
 * 공통 비디오 모듈 생성 함수
 */
export function createVideoModule(
    plugins: VideoModulePlugin<any, any>[],
    moduleId: string,
    moduleTitle: string
): AnalysisModule<Record<string, any>> {

    const defaultModuleSettings = {
        showBackground: true,
    };
    
    const VideoView: React.FC<AnalysisViewProps<Record<string, any>>> = ({ data, currentFrame, settings }) => {
        const rendererRef = useRef<CanvasRendererHandle>(null);
        
        // 각 플러그인의 훅을 순서대로 호출하여 컨텍스트 획득
        const contexts = plugins.map(p => 
            p.usePluginContext(data, settings[p.id] ?? p.defaultSettings)
        );

        const drawImageAt = useCallback((frameIdx: number) => {
            if (!data) return null;
            const moduleSettings = settings.moduleSettings || defaultModuleSettings;
            const rawImgList = data.getRawImgList?.(0);
            const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
            if (!backgroundImage) return null;

            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = backgroundImage.width;
            compositeCanvas.height = backgroundImage.height;
            const ctx = compositeCanvas.getContext('2d');
            if (!ctx) return null;

            // moduleSettings.showBackground 값에 따라 배경 출력 결정
            if (moduleSettings.showBackground !== false) {
                ctx.drawImage(backgroundImage, 0, 0);
            } else {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); // Fill with black if no background
            }
            
            // 모든 플러그인의 오버레이를 순차적으로 그림
            plugins.forEach((p, i) => {
                p.drawOverlay(ctx, frameIdx, data, settings[p.id] ?? p.defaultSettings, contexts[i]);
            });

            return compositeCanvas;
        }, [data, settings.moduleSettings, contexts]);

        useEffect(() => {
            if (!data || !rendererRef.current) return;
            const composite = drawImageAt(currentFrame);
            if (composite) {
                rendererRef.current.updateLayout(composite.width, composite.height);
                rendererRef.current.drawImage(composite);
            }
        }, [data, currentFrame, drawImageAt]);

        return (
            <Div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <CanvasRenderer ref={rendererRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            </Div>
        );
    };

    const VideoSettings: React.FC<AnalysisSettingsProps<Record<string, any>>> = (props) => {
        const { t } = useTranslation();
        const { data, settings, onSettingsChange } = props;
        const [isExporting, setIsExporting] = useState(false);
        const moduleSettings = settings.moduleSettings || defaultModuleSettings;

        const contexts = plugins.map(p => 
            p.usePluginContext(data, settings[p.id] ?? p.defaultSettings)
        );

        const drawImageAt = (frameIdx: number) => {
            if (!data) return null;
            const rawImgList = data.getRawImgList?.(0);
            const backgroundImage = rawImgList ? rawImgList[frameIdx] : null;
            if (!backgroundImage) return null;

            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = backgroundImage.width;
            compositeCanvas.height = backgroundImage.height;
            const ctx = compositeCanvas.getContext('2d');
            if (!ctx) return null;

            // Draw background image only if showBackground is true
            if (moduleSettings.showBackground !== false) {
                ctx.drawImage(backgroundImage, 0, 0);
            } else {
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); // Fill with black if no background
            }
            
            plugins.forEach((p, i) => {
                p.drawOverlay(ctx, frameIdx, data, settings[p.id] ?? p.defaultSettings, contexts[i]);
            });
            return compositeCanvas;
        };

        const handleExportVideo = async () => {
            if (!data || isExporting) return;
            setIsExporting(true);
            const frameCnt = data.getFrameCnt?.() || 0;
            const fps = data.getVideoMetadata?.(0)?.fps || 30;

            await exportVideo(drawImageAt, frameCnt, {
                fps: fps,
                name: `${moduleId}_${Date.now()}.mp4`
            });
            setIsExporting(false);
        };

        return (
            <Div className="flex-view" style={{ flexDirection: 'column', gap: '10px' }}>
                <Button
                    onClick={handleExportVideo}
                    disabled={isExporting || !data}
                    style={{ margin: 0, padding: '8px 15px', width: '100%', cursor: isExporting || !data ? 'not-allowed' : 'pointer' }}
                >
                    {isExporting ? t('common.saving', '저장 중...') : t('common.saveVideo', '비디오 저장')}
                </Button>
                <InputCheckbox
                    label={t('settings.showBackground', '배경 이미지 표시')}
                    checked={moduleSettings.showBackground !== false}
                    onChange={(e) => onSettingsChange({
                        ...settings,
                        moduleSettings: { ...moduleSettings, showBackground: e.target.checked }
                    })}
                    style={{ fontWeight: 'bold', }}
                />
                {plugins.map(p => (
                    <React.Fragment key={p.id}> 
                        <Toggle title={t(`analysisTools.${p.id}`, p.title) as string}>
                            {p.getSettingComponent({
                                ...props,
                                settings: settings[p.id] ?? p.defaultSettings,
                                onSettingsChange: (newVal: any) => onSettingsChange({
                                    ...settings,
                                    [p.id]: newVal
                                })
                            } as any)}
                        </Toggle>
                    </React.Fragment>
                ))}
            </Div>
        );
    };

    const defaultSettings = plugins.reduce((acc, p) => ({
        ...acc,
        [p.id]: p.defaultSettings,
    }), { moduleSettings: defaultModuleSettings });

    // 플러그인들의 로케일 정보를 하나로 통합
    const aggregatedLocales: Record<string, any> = {
        en: {
            analysisTools: { "common-video": "Video" },
            settings: { showBackground: "Show Background Image" }
        },
        ko: {
            analysisTools: { "common-video": "동영상" },
            settings: { showBackground: "배경 이미지 표시" }
        }
    };

    plugins.forEach(p => {
        if (p.locales) {
            Object.entries(p.locales).forEach(([lng, res]) => {
                if (!aggregatedLocales[lng]) aggregatedLocales[lng] = {};
                // 각 섹션별(analysisTools, settings, analysisLabels 등)로 병합
                Object.keys(res).forEach(section => {
                    aggregatedLocales[lng][section] = {
                        ...(aggregatedLocales[lng][section] || {}),
                        ...res[section]
                    };
                });
            });
        }
    });

    return {
        id: moduleId,
        title: moduleTitle,
        View: VideoView,
        Settings: VideoSettings,
        defaultSettings,
        locales: aggregatedLocales
    };
}

/**
 * 여러 플러그인을 조립하기 위한 빌더 클래스
 */
export class VideoModuleBuilder {
    private plugins: VideoModulePlugin<any, any>[] = [];

    addPlugin<TSettings, TContext>(plugin: VideoModulePlugin<TSettings, TContext>) {
        this.plugins.push(plugin);
        return this;
    }

    build(): AnalysisModule<Record<string, any>> {
        return createVideoModule(this.plugins, 'common-video', 'common-video'); // Use ID as title for translation key lookup
    }
}