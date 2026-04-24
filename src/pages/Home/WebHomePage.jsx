import { useNavigate } from 'react-router-dom';
import MarkdownContainer from '../../common/components/MarkdownContainer.jsx'
import { Link } from 'react-router-dom';
import { Div, Box } from '../../common/components/ui/UI.jsx'

const WebHomePage = () => {

  return (
    <>
      <main id="wrapper">

        <nav>
          <Div>
            <Link to="/">CV-Val</Link>
          </Div>
          <Div>
            <ul>
              <li>
                {/* Pose Estimation 페이지로 이동 */}
                <Link to="/pose">자세</Link>
              </li>
              {/* 나머지 메뉴들도 동일하게 Link로 변경 */}
              <li><Link to="/track-ball">공 추적</Link></li>
              <li><Link to="/track-bat">배트 궤적</Link></li>
            </ul>
          </Div>
        </nav>
        <Div id="boxes">
          {/* 기존 container neumorphism 구조들 */}
          <Box className="container">
            <MarkdownContainer file="./goal.md" />
          </Box>
          <Box className="container">
            <MarkdownContainer file="./feature.md" />
          </Box>

          <Box className="container">
            <details>
              <summary><h1>🔗 참고</h1></summary>
              <hr />
              <MarkdownContainer file="./ref.md" />
            </details>
          </Box>
        </Div>
      </main>
    </>
  );
};

export default WebHomePage;