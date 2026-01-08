
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface MatchScoreProps {
  score: number;
}

const MatchScore: React.FC<MatchScoreProps> = ({ score }) => {
  const data = [
    { name: 'Match', value: score },
    { name: 'Gap', value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s >= 80) return '#2563eb'; // Blue-600
    if (s >= 60) return '#3b82f6'; // Blue-500
    return '#f59e0b'; // Amber-500
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-44 h-44 relative drop-shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={82}
              startAngle={90}
              endAngle={450}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              <Cell fill={getColor(score)} />
              <Cell fill="#f8fafc" />
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox as any;
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                      <tspan x={cx} dy="-0.2em" fontSize="34px" fontWeight="900" fill="#0f172a">{score}%</tspan>
                      {/* Fix: textTransform is a CSS property and not a valid SVG attribute prop in React. Moved to style object. */}
                      <tspan 
                        x={cx} 
                        dy="1.6em" 
                        fontSize="10px" 
                        fontWeight="800" 
                        fill="#64748b" 
                        style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      >
                        Match
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MatchScore;
