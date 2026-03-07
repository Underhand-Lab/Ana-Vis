import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Navigation = ({ buttons }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 셀렉트 박스 변경 시 페이지 이동 (기존 value="../pose" 등의 로직 대체)
  const handleFeatureChange = (e) => {
    const path = e.target.value;
    // "../pose" 형태를 리액트 라우터 경로 "/pose" 형태로 변환하여 이동
    const target = path.replace('../', '/');
    navigate(target);
  };

  return (
    <nav>
      <ul>
        {/* 기존의 <a href="../"> 대신 Link 컴포넌트 사용 */}
        <li><Link to="/">CV-Val</Link></li>
        <li>
          {/* 리액트 친화적인 select로 교체 */}
          <select 
            id="feature" 
            className="neumorphism-select"
            value={`..${location.pathname === '/' ? '/home' : location.pathname}`} 
            onChange={handleFeatureChange}
          >
            <option value="../pose">Pose Analysis</option>
            <option value="../track-ball">Ball Tracking</option>
            <option value="../track-bat">Bat Tracking</option>
          </select>
        </li>
      </ul>
      
      <ul>
        {
          buttons.map((btn) => {
            return (
              <li key={btn.name}>
            <button onClick={btn.action}>
              {btn.name}
            </button>
            </li>
            );
          })
        }
        {/*
        <li>
          {/* id 대신 리액트 props로 받은 핸들러 연결 }
          <button onClick={onOpenProcess}>
            비디오 처리
          </button>
        </li>
        <li>
          <label htmlFor="load-from-file" className="label-for-btn">
            불러오기
          </label>
          <input 
            type="file" 
            id="load-from-file" 
            style={{ display: 'none' }} 
            accept=".cvp, .cvbt" 
            onChange={onLoadFile}
          />
        </li>
        <li>
          <button onClick={onSaveFile}>
            저장
          </button>
        </li>*/}
      </ul>
    </nav>
  );
};

export default Navigation;