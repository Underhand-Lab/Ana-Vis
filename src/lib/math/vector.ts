import { Vector3 } from "../cv-val/pose/types";

export function magVec(vec: Vector3): number {
    let sum = 0;

    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }

    return Math.sqrt(sum);
}

export function subVec(vec1: Vector3, vec2: Vector3): Vector3 {
    const ret: number[] = [];

    for (let i = 0; i < vec1.length; i++) {
        ret.push(vec1[i] - vec2[i]);
    }

    return ret as Vector3;
}

export function dotVec(vec1: Vector3, vec2: Vector3): number {
    let sum = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        sum += vec1[i] * vec2[i];
    }

    return sum;
}