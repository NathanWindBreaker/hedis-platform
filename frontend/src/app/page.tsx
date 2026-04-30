'use client';
import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  // Используем ref для хранения экземпляра cy, чтобы иметь к нему доступ вне useEffect
  const cyRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    fetch('http://localhost:4000/api/graph')
      .then(res => res.json())
      .then(data => {
        // Проверяем, что данные пришли корректно
        if (!data.elements) return;

        const cy = cytoscape({
          container: containerRef.current,
          elements: data.elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#6366f1',
                'label': 'data(label)',
                'color': '#fff',
                'text-valign': 'center',
                'text-margin-y': 40,
                'width': 50,
                'height': 50,
                'font-size': '12px',
                'text-outline-width': 2,
                'text-outline-color': '#000'
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 4,
                'border-color': '#fbbf24',
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 2,
                'line-color': '#4b5563',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '10px',
                'color': '#9ca3af',
                'target-arrow-color': '#4b5563'
              }
            }
          ],
          layout: { 
            name: 'cose', 
            animate: true,
            randomize: true,
            componentSpacing: 100
          }
        });

        cyRef.current = cy;

        cy.on('tap', 'node', (evt) => {
          setSelectedNode(evt.target.data());
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) setSelectedNode(null);
        });

        // Форсируем перерисовку при монтировании
        cy.resize();
        cy.fit();
      })
      .catch(err => console.error("Ошибка загрузки графа:", err));

    // Очистка при размонтировании
    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedNode) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`http://localhost:4000/api/entities/${selectedNode.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Файл успешно загружен!');
      } else {
        alert('Ошибка при загрузке файла');
      }
    } catch (err) {
      console.error('Network error:', err);
    }
  };

  return (
    // Добавил h-screen и w-screen здесь
    <main className="relative w-screen h-screen bg-black text-white overflow-hidden">
      
      {/* 1. Слой графа. Теперь с жесткими размерами через классы h-full w-full */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-0 w-full h-full" 
        style={{ height: '100vh', width: '100vw' }} // На всякий случай добавим inline-style
      />

      {/* 2. Слой интерфейса */}
      <div className="pointer-events-none absolute inset-0 z-10 flex justify-between p-6 h-full w-full">
        <h1 className="pointer-events-auto text-xl font-light tracking-widest bg-black/20 p-2 rounded backdrop-blur-sm self-start">
          HEDIS <span className="font-bold text-indigo-500">PLATFORM</span>
        </h1>

        <div className="flex flex-col items-end h-full pointer-events-none">
          {/* Панель теперь живет всегда, просто выезжает */}
          <div className={`pointer-events-auto w-80 h-full bg-gray-900/90 backdrop-blur-md border-l border-gray-800 p-6 shadow-2xl transition-transform duration-300 ease-in-out transform ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
            {selectedNode && (
              <div className="space-y-6 flex flex-col h-full">
                <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                  <h2 className="text-2xl font-bold text-indigo-400 break-words leading-tight">{selectedNode.label}</h2>
                  <div className="text-[10px] text-gray-500 font-mono bg-black/50 p-2 rounded select-all break-all">{selectedNode.id}</div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase text-gray-400 border-b border-gray-800 pb-1">Свойства</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedNode).map(([key, val]) => (
                        !['id', 'label'].includes(key) && (
                          <div key={key} className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">{key}</span>
                            <span className="text-indigo-100 text-sm">{String(val)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    Прикрепить файл
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}