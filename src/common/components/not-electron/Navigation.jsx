import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const WebNavigation = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleFeatureChange = (e) => {
        navigate(e.target.value.replace('../', '/'));
    };

    const navStyle = {
        position: 'sticky',
        top: 0,
        width: '100%',
        backgroundColor: 'var(--secondary-color)',
        color: '#aaaaaa',
        fontSize: '15px',

        margin: 0,
        zIndex: 2000,
        transition: 'transform 0.5s ease',
        padding: '10px 0',
        WebkitAppRegion: 'none',
        borderBottom: 'none',
    };

    return (
        <nav style={navStyle}>

            <div style={{
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                flexWrap: 'wrap'
            }}>
                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>

                    <li>
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>CV-Val</Link>
                    </li>

                    <li>
                        <select
                            className="neumorphism-select"
                            style={{ height: '26px' }}
                            value={`..${location.pathname === '/' ? '/home' : location.pathname}`}
                            onChange={handleFeatureChange}
                        >
                            <option value="../pose">자세</option>
                            <option value="../track-ball">공 추적</option>
                            <option value="../track-bat">배트 궤적</option>
                        </select>
                    </li>
                </ul>

                <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                    {fileButtons.map((btn) => (
                        <li key={btn.name}>
                            <button
                                onClick={btn.action}
                                style={{ padding: '2px 10px' }}
                            >
                                {btn.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default WebNavigation;
