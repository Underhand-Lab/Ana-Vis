import { useState, useCallback, useEffect, ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CVValData } from '@packages/cv-val/data/cvval-data';
import { AnalysisModule } from '@packages/cv-val/types/analysis-module';
import { useProcessor } from '@packages/cv-val/hooks/useProcessor';
import { FEATURE_REGISTRY, ALL_DETECTORS, ALL_AVAILABLE_MODULES } from '../../../FeatureRegistry';
import { useTrackBallFrame } from '@apps/features/track-ball/hooks/useTrackBallFrame';
import { useTrackBatFrame } from '@apps/features/track-bat/hooks/useTrackBatFrame';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

export interface AppLogic {
  processedData: CVValData;
  currentIdx: number;
  setCurrentIdx: Dispatch<SetStateAction<number>>;
  activeModules: AnalysisModule<any>[];
  setActiveModules: Dispatch<SetStateAction<AnalysisModule<any>[]>>;
  confValue: number;
  editingType: 'ball' | 'bat' | null;
  setEditingType: Dispatch<SetStateAction<'ball' | 'bat' | null>>;
  status: string;
  errorMessage: string | null;
  progress: { current: number; total: number };
  isProcessing: boolean;
  cancelProcessing: () => void;
  ballFrame: ReturnType<typeof useTrackBallFrame>;
  batFrame: ReturnType<typeof useTrackBatFrame>;
  loadData: (file: File) => Promise<string | undefined>;
  handleVideoSelect: (files: FileList | null) => Promise<boolean | undefined>;
  handleProcessVideo: (type: string, modelKey: string) => Promise<void>;
  handleAddModule: (type: string) => AnalysisModule<any> | undefined;
  handleConfChange: (type: string, e: ChangeEvent<HTMLInputElement>) => void;
  handleEditorCandidateSelect: (type: string, frameIdx: number, candIdx: number) => void;
  removeModule: (item: AnalysisModule<any>) => void;
}

export const useAppLogic = (): AppLogic => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { externalFile?: File };

  const [processedData, setProcessedData] = useState<CVValData>(() => new CVValData());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeModules, setActiveModules] = useState<AnalysisModule<any>[]>([
    // 초기 모듈에도 ID를 부여하지 않습니다. (레이아웃 시스템이 부여)
    { ...ALL_AVAILABLE_MODULES["Video"] }
  ]);
  const [confValue, setConfValue] = useState(0.5);
  const [editingType, setEditingType] = useState<'ball' | 'bat' | null>(null);

  const { status, progress, isProcessing, errorMessage, loadVideo, runInference, cancelProcessing } = useProcessor();
  const ballFrame = useTrackBallFrame(processedData);
  const batFrame = useTrackBatFrame(processedData);

  const getFeatureTypeByFile = (fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.cvp')) return 'pose';
    if (name.endsWith('.cvbl')) return 'ball';
    if (name.endsWith('.cvbt')) return 'bat';
    if (name.endsWith('.cvval')) return 'unified';
    if (VIDEO_EXTENSIONS.some(ext => name.endsWith(ext))) return 'video';
    return 'pose';
  };

  const loadData = useCallback(async (file: File) => {
    if (!file) return;
    const type = getFeatureTypeByFile(file.name);
    try {
      if (type === 'video') {
        const result = await loadVideo([file] as any, new CVValData());
        setProcessedData(result);
        setCurrentIdx(0);
        return "openProcessModal";
      }
      const newData = new CVValData();
      if (type === 'unified') {
        await newData.loadFromFile(file, FEATURE_REGISTRY, loadVideo);
      } else {
        const config = FEATURE_REGISTRY[type];
        const featureData = new config.DataClass();
        await featureData.loadFromFile(file);
        newData.set(type, featureData);
        newData.setName(file.name);
        if (config.tools.length > 0) newData.addAnalysisTools(type, config.tools);
      }
      setProcessedData(newData);
      setCurrentIdx(0);
    } catch (err) {
      console.error(err);
      alert("데이터 파일을 불러오는 데 실패했습니다.");
    }
  }, [loadVideo]);

  useEffect(() => {
    if (state?.externalFile) {
      loadData(state.externalFile);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state, loadData, navigate, location.pathname]);

  const handleVideoSelect = async (files: FileList | null) => {
    if (!files || files.length < 1) return;
    try {
      const result = await loadVideo(files, processedData);
      setProcessedData(result);
      setCurrentIdx(0);
      return true;
    } catch (e) {
      alert("비디오 로드 중 오류 발생");
      return false;
    }
  };

  const handleProcessVideo = async (type: string, modelKey: string) => {
    const config = FEATURE_REGISTRY[type];
    const featureData = new config.DataClass();
    const result = await runInference(ALL_DETECTORS[type][modelKey], type, processedData, featureData);
    if (config.tools.length > 0) result.addAnalysisTools(type, config.tools);
    if (featureData.setConf) featureData.setConf(config.defaultConf || 0.5);
    setProcessedData(result);
    setCurrentIdx(0);
  };

  const handleAddModule = (type: string) => {
    const moduleBase = ALL_AVAILABLE_MODULES[type];
    if (moduleBase) {
      // ID 부여 없이 객체만 생성하여 전달
      const newModule = { ...moduleBase };
      setActiveModules((prev) => [...prev, newModule]);
      return newModule;
    }
    return undefined;
  };

  const handleConfChange = (type: string, e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setConfValue(val);
    if (processedData && processedData.exist(type)) {
      const featureData = processedData.get(type) as any;
      if (featureData.setConf) {
        featureData.setConf(val);
        setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
      }
    }
  };

  const handleEditorCandidateSelect = (type: string, frameIdx: number, candIdx: number) => {
    if (processedData && processedData.exist(type)) {
      const featureData = processedData.get(type) as any;
      featureData.setSelectedIdx(frameIdx, candIdx);
      setProcessedData(Object.assign(Object.create(Object.getPrototypeOf(processedData)), processedData));
    }
  };

  // 객체 참조를 비교하여 삭제 수행
  const removeModule = (item: AnalysisModule<any>) => setActiveModules(prev => prev.filter(m => m !== item));

  return {
    processedData,
    currentIdx,
    setCurrentIdx,
    activeModules,
    setActiveModules,
    confValue,
    editingType,
    setEditingType,
    status,
    errorMessage,
    progress,
    isProcessing,
    cancelProcessing,
    ballFrame,
    batFrame,
    loadData,
    handleVideoSelect,
    handleProcessVideo,
    handleAddModule,
    handleConfChange,
    handleEditorCandidateSelect,
    removeModule
  };
};
