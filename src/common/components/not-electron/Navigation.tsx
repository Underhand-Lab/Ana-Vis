import React, { ChangeEvent } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Select from '../ui/Select';

export const FEATURES = [
    { label: '자세', value: '/pose' },
    { label: '공 추적', value: '/track-ball' },
    { label: '배트 궤적', value: '/track-bat' }
];

export interface NavButton {
    name: string;
    action: () => void;
}

interface WebNavigationProps {
    fileButtons?: NavButton[];
    toolButtons?: any[];
}

const WebNavigation: React.FC<WebNavigationProps> = ({ fileButtons = [], toolButtons = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleFeatureChange = (e: ChangeEvent<HTMLSelectElement>) => {
        navigate(e.target.value);
    };

    const currentPath = location.pathname === '/' ? '/pose' : location.pathname;

    const navStyle: React.CSSProperties & { WebkitAppRegion?: string } = {
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
                        <Select 
                            className="neumorphism-select"
                            options={FEATURES}
                            value={currentPath}
                            onChange={handleFeatureChange}
                        />
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
