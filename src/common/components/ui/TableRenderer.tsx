import React from 'react';

interface DataTableProps {
  data: Record<string, any> | null;
}

// 기존 Table 클래스의 역할을 하는 순수 UI 컴포넌트
const TableRenderer: React.FC<DataTableProps> = ({ data }) => {
  if (!data) {
    return (
      <table className="analysis-table">
        <tbody>
          <tr><td>?</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="analysis-table">
      <tbody>
        {Object.keys(data).map((key) => (
          <tr key={key}>
            {/* 기존 e-text 구조 유지 */}
            <th><span data-key={key}>{key}</span></th>
            <td>
              {typeof data[key] === 'object' && data[key] !== null 
                ? JSON.stringify(data[key]) 
                : (data[key] !== null && data[key] !== undefined ? data[key] : "?")
              }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableRenderer;