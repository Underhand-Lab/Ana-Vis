import React, { useState, useEffect, useRef, useCallback } from 'react';
import { vars } from '@shared/bridges/UIBridge';

export interface Option {
  label: string;
  value: string;
}

export interface SelectSection {
  label?: string;
  options: Option[];
}

interface UseSearchableSelectProps {
  value: string;
  sections: SelectSection[];
  onChange: (value: string) => void;
  placeholder: string;
}

const matchedOptions = (term: string, options: Option[]) => {
  return options.find((o) => o?.label?.toLowerCase() === term.toLowerCase());
};

export const useSearchableSelect = ({
  value,
  sections,
  onChange,
  placeholder,
}: UseSearchableSelectProps) => {
  const allOptions = sections.flatMap((s: SelectSection) => s.options || []);
  const activeLabel = allOptions.find((o) => o?.value === value)?.label || value;

  const [isOpen, setIsOpen] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [searchTerm, setSearchTerm] = useState(activeLabel || '');
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const keyboardDetected = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(activeLabel);
      setIsEditable(false);
    }
  }, [activeLabel, isOpen]);

  const updateMenuPosition = useCallback(() => {
    if (containerRef.current) {
      if (isEditable) {
        const vv = window.visualViewport;
        const bottomOffset = vv ? window.innerHeight - (vv.offsetTop + vv.height) : 0;
        
        setMenuStyle({
          position: 'fixed',
          bottom: bottomOffset,
          left: 0,
          width: '100vw',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column-reverse',
          background: vars.surface,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
          fontFamily: vars.font
        });
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = 220;
        const showAtTop = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        setMenuStyle({
          position: 'fixed',
          top: showAtTop ? rect.top - menuHeight - 5 : rect.bottom + 5,
          left: rect.left,
          width: rect.width,
          zIndex: 10001,
          fontFamily: vars.font
        });
      }
    }
  }, [isEditable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideInput = containerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideInput && !isInsideMenu) {
        if (isEditable) {
          setIsEditable(false);
        } else {
          setIsOpen(false);
          setHoveredValue(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditable]);

  useEffect(() => {
    if (!isEditable) keyboardDetected.current = false;
  }, [isEditable]);

  useEffect(() => {
    const handleResize = () => {
      updateMenuPosition();
      const vv = window.visualViewport;
      if (isEditable && vv) {
        if (vv.height < window.innerHeight * 0.85) {
          keyboardDetected.current = true;
        } else if (keyboardDetected.current && vv.height > window.innerHeight * 0.95) {
          setIsEditable(false);
        }
      }
    };

    if (isOpen) {
      handleResize();
      const viewport = window.visualViewport;
      if (viewport) {
        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', updateMenuPosition);
      } else {
        window.addEventListener('resize', handleResize);
      }
      window.addEventListener('scroll', updateMenuPosition, true);
    }
    return () => {
      const viewport = window.visualViewport;
      if (viewport) {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', updateMenuPosition);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, isEditable, updateMenuPosition]);

  const handleSelect = (val: string) => {
    const label = allOptions.find(o => o.value === val)?.label || val;
    setSearchTerm(label); 
    onChange(val);
    setIsOpen(false);
    setIsEditable(false);
  };

  const isInitialState = searchTerm === '' || searchTerm === activeLabel;
  const filteredOptions = isInitialState
    ? []
    : allOptions.filter((o: Option) => 
        o?.label?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleActivation = () => {
    if (!isOpen) setIsOpen(true);
    else if (!isEditable) setIsEditable(true);
  };

  return {
    isOpen,
    setIsOpen,
    isEditable,
    setIsEditable,
    searchTerm,
    setSearchTerm,
    hoveredValue,
    setHoveredValue,
    menuStyle,
    containerRef,
    menuRef,
    inputRef,
    mobileInputRef,
    allOptions,
    filteredOptions,
    isInitialState,
    handleSelect,
    handleActivation,
  };
};