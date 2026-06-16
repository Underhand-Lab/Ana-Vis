import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Div, InputText, vars } from '@shared/bridges/UIBridge';

interface Option {
  label: string;
  value: string;
}

interface SelectSection {
  label?: string;
  options: Option[];
}

interface SearchableSelectProps {
  value: string;
  sections: SelectSection[]; // 라벨과 옵션을 포함한 섹션 배열
  onChange: (value: string) => void;
  placeholder?: string;
  renderOption?: (option: Option, isSelected: boolean, isHovered: boolean) => React.ReactNode;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  searchResultsLabel?: string; // 검색 결과 섹션 라벨
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  sections,
  onChange,
  placeholder = 'Search...',
  renderOption,
  style,
  inputStyle,
  searchResultsLabel
}) => {
  const allOptions = sections.flatMap((s: SelectSection) => s.options || []); // 검색 및 선택값 확인을 위한 평탄화
  const activeLabel = allOptions.find(o => o?.value === value)?.label || value;
  const [isOpen, setIsOpen] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [searchTerm, setSearchTerm] = useState(activeLabel || '');
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 value 변경 또는 드롭다운이 닫힐 때 searchTerm 동기화
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(activeLabel);
      setIsEditable(false);
    }
  }, [activeLabel, isOpen]);

  // 드롭다운 위치 계산 함수
  const updateMenuPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 5,
        left: rect.left,
        width: rect.width,
        zIndex: 10001, // Modal(100)보다 높게 설정
        fontFamily: vars.font // 포털로 이동하므로 폰트 명시적 적용
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideInput = containerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideInput && !isInsideMenu) {
        setIsOpen(false);
        setIsEditable(false);
        setHoveredValue(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 화면 크기 조정이나 스크롤 시 위치 재계산
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true); // 캡처링 단계에서 스크롤 감지
    }
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, []);

  const handleSelect = (val: string) => {
    const label = allOptions.find(o => o.value === val)?.label || val;
    setSearchTerm(label); 
    onChange(val);
    setIsOpen(false);
    setIsEditable(false);
  };

  // 입력 중이 아니거나(초기 상태), 입력값이 현재 레이블과 동일할 경우 전체 목록을 보여줌
  const isInitialState = searchTerm === '' || searchTerm === activeLabel;

  const filteredOptions = isInitialState
    ? []
    : allOptions.filter((o: Option) => 
        o?.label?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <Div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <InputText 
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onFocus={() => setIsOpen(true)}
        onClick={(e) => {
          // 메뉴가 이미 열려있을 때 클릭하면 입력 가능 모드로 전환
          if (isOpen && !isEditable) {
            setIsEditable(true);
            (e.target as any).select();
          }
        }}
        readOnly={!isEditable}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && searchTerm) {
            const matched = allOptions.find(o => o?.label?.toLowerCase() === searchTerm.toLowerCase());
            handleSelect(matched ? matched.value : searchTerm);
          }
        }}
        style={{
            cursor: isEditable ? 'text' : 'pointer',
            ...inputStyle
        }}
      />
      
      {isOpen && createPortal(
        <Div ref={menuRef} style={{
          ...menuStyle,
          maxHeight: '220px',
          overflowY: 'auto',
          background: vars.surface,
          border: `1px solid ${vars.text}33`,
          borderRadius: '0px',
          boxShadow: 'none', // 입체감 제거
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 0'
        }}>
          {isInitialState && sections.map((section: SelectSection, sIdx: number) => (
            <React.Fragment key={`section-${sIdx}`}>
              {section.options.length > 0 && (
                <>
                  {section.label && (
                    <Div style={{ fontSize: '10px', padding: '4px 12px', opacity: 0.5, fontWeight: 'bold', color: vars.text, textAlign: 'left' }}>
                      {section.label.toUpperCase()}
                    </Div>
                  )}
                  {section.options.map((opt: Option) => (
                    <Div 
                      key={opt.value} 
                      onClick={() => handleSelect(opt.value)} 
                      onMouseEnter={() => setHoveredValue(opt.value)}
                      onMouseLeave={() => setHoveredValue(null)}
                      style={optionStyle(value === opt.value, hoveredValue === opt.value)}>
                      {renderOption ? renderOption(opt, value === opt.value, hoveredValue === opt.value) : opt.label}
                    </Div>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
          {!isInitialState && (
            <>
              {searchResultsLabel && (
                <Div style={{ fontSize: '10px', padding: '4px 12px', opacity: 0.5, fontWeight: 'bold', color: vars.text, textAlign: 'left' }}>
                  {searchResultsLabel.toUpperCase()}
                </Div>
              )}
              {searchTerm && !filteredOptions.length && (
                <Div
                  onClick={() => handleSelect(searchTerm)} 
                  onMouseEnter={() => setHoveredValue(searchTerm)}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={optionStyle(value === searchTerm, hoveredValue === searchTerm)}>
                  "{searchTerm}" Use
                </Div>
              )}
              {filteredOptions.map((opt: Option) => (
                <Div
                  key={opt.value} 
                  onClick={() => handleSelect(opt.value)} 
                  onMouseEnter={() => setHoveredValue(opt.value)}
                  onMouseLeave={() => setHoveredValue(null)}
                  style={optionStyle(value === opt.value, hoveredValue === opt.value)}>
                  {renderOption ? renderOption(opt, value === opt.value, hoveredValue === opt.value) : opt.label}
                </Div>
              ))}
            </>
          )}
        </Div>,
        document.body
      )}
    </Div>
  );

  function optionStyle(isSelected: boolean, isHovered: boolean): React.CSSProperties {
    return {
      textAlign: 'left',
      background: isHovered ? `${vars.primary}33` : isSelected ? `${vars.primary}11` : 'transparent',
      color: vars.text,
      border: 'none',
      padding: '6px 12px',
      cursor: 'pointer',
      fontSize: '14px',
      width: '100%',
      borderRadius: 0,
      fontWeight: isSelected ? 'bold' : 'normal',
      display: 'block',
      boxSizing: 'border-box'
    };
  }
};

export default SearchableSelect;