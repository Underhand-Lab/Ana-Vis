import React from 'react';

// 기존 Table 클래스의 역할을 하는 순수 UI 컴포넌트
const DataTable = ({ data }) => {
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
            <td>{data[key] !== null ? data[key] : "?"}</td>
          </tr>
        ))}
      </tbody>
      <style>{`
        .analysis-table { width: 100%; border-collapse: collapse; }
        .analysis-table th, .analysis-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .analysis-table th { background-color: #f2f2f2; width: 40%; font-size: 0.9em; }
        .analysis-table td { font-family: monospace; }
      `}</style>
    </table>
  );
};

export default DataTable;