import { useNavigate } from 'react-router-dom';
import MarkdownContainer from '../common/components/MarkdownContainer'
import { Link } from 'react-router-dom';

const HomePage = () => {

  return (
    <>
      <main id="wrapper">

        <nav>
          <div>
            <Link to="/">CV-Val</Link>
          </div>
          <div>
            <ul>
              <li>
                {/* Pose Estimation 페이지로 이동 */}
                <Link to="/pose">
                  <span>Pose Estimation</span>
                </Link>
              </li>
              {/* 나머지 메뉴들도 동일하게 Link로 변경 */}
              <li><Link to="/track-ball">Track Ball</Link></li>
              <li><Link to="/track-bat">Track Bat</Link></li>
            </ul>
          </div>
        </nav>
        <div id="boxes">
          {/* 기존 container neumorphism 구조들 */}
          <div className="container neumorphism">
            <MarkdownContainer file="./goal.md" />
          </div>
          <div className="container neumorphism">
            <MarkdownContainer file="./feature.md" />
          </div>

          <div className="container neumorphism">
            <details>
              <summary><h1>🔗 참고</h1></summary>
              <hr />
              <MarkdownContainer file="./ref.md" />
            </details>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomePage;