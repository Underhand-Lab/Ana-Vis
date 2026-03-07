function magVec(vec) {
    let sum = 0;

    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }

    return Math.sqrt(sum);
}

function subVec(vec1, vec2) {

    const ret = []

    for (let i = 0; i < vec1.length; i++) {
        ret.push(vec1[i] - vec2[i]);
    }

    return ret;

}

function dotVec(vec1, vec2) {
    let sum = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        sum += vec1[i] * vec2[i];
    }

    return sum;
}

export { magVec, subVec, dotVec };