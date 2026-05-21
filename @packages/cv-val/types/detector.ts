export interface IDetector {
    initialize(): Promise<void>;
    process(image: any): Promise<any>;
}