'use client';
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchGraphData = async () => {
    const response = await fetch('http://localhost:4000/api/graph');
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    fetchGraphData().then((data) => {
      cytoscape({
        container: containerRef.current,
        elements: data.elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#6610f2',
              'label': 'data(label)',
              'color': '#fff',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 60,
              'height': 60
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px'
            }
          }
        ],
        layout: {
          name: 'breadthfirst', // Простая иерархическая раскладка
          directed: true,
          padding: 10
        }
      });
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Edge Core Knowledge Graph</h1>
      
      <div 
        ref={containerRef} 
        className="w-full h-[600px] bg-gray-800 rounded-xl border border-gray-700 shadow-2xl"
      />
      
      <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
        <div className="p-4 bg-gray-800 rounded border border-purple-500">
          <p className="font-bold">PostgreSQL</p>
          <span className="text-gray-400">Structured Metadata</span>
        </div>
        <div className="p-4 bg-gray-800 rounded border border-blue-500">
          <p className="font-bold">Neo4j</p>
          <span className="text-gray-400">Graph Relations</span>
        </div>
        <div className="p-4 bg-gray-800 rounded border border-green-500">
          <p className="font-bold">MinIO</p>
          <span className="text-gray-400">Object Storage</span>
        </div>
      </div>
    </main>
  );
}