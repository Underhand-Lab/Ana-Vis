class BoxList {
    constructor(container) {
        this.boxContainer = container
    }

    addBoxTemplate(src, closeFunc, callback) {
        return new Promise((resolve, reject) => {
            fetch(src).then(response => {
                if (!response.ok) {
                    throw new Error(`파일을 불러오는 데 실패했습니다:
                        ${response.statusText}`);
                }
                return response.text();
            }).then((text) => {
                const box = this.addBox(text, closeFunc);
                callback(box);
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }

    addBox(content, closeFunc) {

        // 1. 메인 컨테이너 DIV 생성
        const instanceDiv = document.createElement('div');

        const closeBtn = document.createElement('button');

        closeBtn.className = "remove-box-button";
        closeBtn.innerText = "✕";
        closeBtn.addEventListener('click', () => {
            try {
                if (closeFunc != null) {
                    closeFunc();
                }
                this.boxContainer.removeChild(instanceDiv);

            }
            catch(error) {
                alert(error);
            }
            
        });

        // 2. 제목과 삭제 버튼 ('-')을 포함하는 HTML 구조
        instanceDiv.innerHTML = content;
        instanceDiv.prepend(closeBtn);

        // 3. DOM에 추가
        this.boxContainer.appendChild(instanceDiv);

        return instanceDiv;
    }

    clear() {
        this.boxContainer.innerHTML = "";
    }

}

const boxContainer = document.getElementById('boxes');

function createNewAnalysisDiv(content) {

    // 1. 메인 컨테이너 DIV 생성
    const instanceDiv = document.createElement('div');
    instanceDiv.className = 'container';

    const closeBtn = document.createElement('button');
    closeBtn.innerText = "X";

    console.log(closeBtn.innerText);

    closeBtn.className = "remove-box-button";
    closeBtn.addEventListener('click', () => {

        boxContainer.removeChild(instanceDiv);
        console.log(`Div가 삭제되었습니다.`);
    });

    // 2. 제목과 삭제 버튼 ('-')을 포함하는 HTML 구조
    instanceDiv.innerHTML = content;
    instanceDiv.prepend(closeBtn);

    // 3. DOM에 추가
    boxContainer.appendChild(instanceDiv);

    return instanceDiv;
}

/*
window.onload = function () {

    // DOM 요소 가져오기
    const addBoxButton = document.getElementById('add-box-button');

    // 🚀 '+' 버튼 클릭 이벤트 리스너: 새 분석 Div 추가
    addBoxButton.addEventListener('click', () => {
        const tmp = `
        <div >
            <h3>분석</h3>
        </div>
        
        <p>여기에 시각화 및 그래프가 들어갈 자리입니다.</p>
        
        <hr>
    `;
        createNewAnalysisDiv(tmp);
    });
}*/

export { BoxList, createNewAnalysisDiv }