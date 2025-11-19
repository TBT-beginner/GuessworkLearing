import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QuizSet, Question, UserProfile } from '../types';
import { getQuizSets, saveQuizSet, deleteQuizSet, generateUniqueId } from '../services/storage';
import { Plus, Trash2, Save, Edit3, ArrowLeft, Upload, FileUp, HelpCircle, Download, X, Check, AlertCircle } from 'lucide-react';

interface QuizEditorProps {
  user: UserProfile;
  onBack: () => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ user, onBack }) => {
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [editingSet, setEditingSet] = useState<QuizSet | null>(null);
  const [showImportHelp, setShowImportHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSets(getQuizSets());
  }, []);

  // Calculate unique existing areas to show as suggestions
  const existingAreas = useMemo(() => {
    const areas = new Set<string>();
    areas.add('Grammar');
    areas.add('Vocabulary');
    areas.add('Reading');
    sets.forEach(s => s.questions.forEach(q => areas.add(q.area)));
    if (editingSet) {
        editingSet.questions.forEach(q => areas.add(q.area));
    }
    return Array.from(areas).sort();
  }, [sets, editingSet]);

  const handleCreateSet = () => {
    const newSet: QuizSet = {
      id: generateUniqueId(),
      title: 'New Problem Set',
      description: 'Description of this set...',
      questions: [],
      createdAt: Date.now(),
      createdBy: user.email,
    };
    setEditingSet(newSet);
  };

  const handleEditSet = (set: QuizSet) => {
    setEditingSet(JSON.parse(JSON.stringify(set))); // Deep copy
  };

  const handleDeleteSet = (id: string) => {
    if (window.confirm('Are you sure? This will delete the set and all associated results.')) {
      deleteQuizSet(id);
      setSets(getQuizSets());
    }
  };

  const handleSaveSet = () => {
    if (editingSet) {
      saveQuizSet(editingSet);
      setSets(getQuizSets());
      setEditingSet(null);
    }
  };

  const addQuestion = () => {
    if (!editingSet) return;
    const newQ: Question = {
      id: generateUniqueId(),
      text: 'New Question Text',
      area: 'Grammar',
      correctOptionId: 'opt1',
      options: [
        { id: 'opt1', text: 'Option 1' },
        { id: 'opt2', text: 'Option 2' },
        { id: 'opt3', text: 'Option 3' },
        { id: 'opt4', text: 'Option 4' },
      ],
      explanation: 'Explanation here.',
      hint: '',
      translation: ''
    };
    setEditingSet({
      ...editingSet,
      questions: [...editingSet.questions, newQ]
    });
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    if (!editingSet) return;
    const updatedQs = [...editingSet.questions];
    updatedQs[index] = { ...updatedQs[index], [field]: value };
    setEditingSet({ ...editingSet, questions: updatedQs });
  };

  const updateOption = (qIndex: number, optIndex: number, text: string) => {
    if (!editingSet) return;
    const updatedQs = [...editingSet.questions];
    const updatedOpts = [...updatedQs[qIndex].options];
    updatedOpts[optIndex] = { ...updatedOpts[optIndex], text };
    updatedQs[qIndex].options = updatedOpts;
    setEditingSet({ ...editingSet, questions: updatedQs });
  };

  const removeQuestion = (index: number) => {
    if (!editingSet) return;
    const updatedQs = editingSet.questions.filter((_, i) => i !== index);
    setEditingSet({ ...editingSet, questions: updatedQs });
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const parseCSVLine = (text: string) => {
    const result = [];
    let cell = '';
    let inQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuote && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        result.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSet) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r\n|\n|\r/);
        const newQuestions: Question[] = [];
        let successCount = 0;
        
        const startIndex = lines[0]?.toLowerCase().includes('category') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue; 

          const cols = parseCSVLine(line);
          if (cols.length < 7) continue;

          const [area, qText, optA, optB, optC, optD, correctRaw, explanation, hint, translation] = cols;

          const optMap = ['a', 'b', 'c', 'd'];
          let correctIndex = 0;
          const rawLower = correctRaw?.toLowerCase().trim() || '';
          
          if (['1', '2', '3', '4'].includes(rawLower)) {
             correctIndex = parseInt(rawLower) - 1;
          } else if (optMap.includes(rawLower)) {
             correctIndex = optMap.indexOf(rawLower);
          }

          const qId = generateUniqueId();
          const optIds = [generateUniqueId(), generateUniqueId(), generateUniqueId(), generateUniqueId()];

          const newQ: Question = {
            id: qId,
            area: area || 'General',
            text: qText || 'Untitled Question',
            options: [
              { id: optIds[0], text: optA || '' },
              { id: optIds[1], text: optB || '' },
              { id: optIds[2], text: optC || '' },
              { id: optIds[3], text: optD || '' },
            ],
            correctOptionId: optIds[correctIndex] || optIds[0],
            explanation: explanation || '',
            hint: hint || '',
            translation: translation || ''
          };

          newQuestions.push(newQ);
          successCount++;
        }

        if (successCount > 0) {
          setEditingSet(prev => prev ? {
             ...prev,
             questions: [...prev.questions, ...newQuestions]
          } : null);
          alert(`Successfully imported ${successCount} questions.`);
        } else {
          alert('No valid questions found. Please check the file format.');
        }

      } catch (err) {
        console.error(err);
        alert('Error parsing CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
      const headers = ['Category', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (A/B/C/D)', 'Explanation', 'Hint (Optional)', 'Translation (Optional)'];
      const example = ['Grammar', '"She ___ to the store."', 'go', 'goes', 'going', 'gone', 'B', '"Third person singular requires **goes**."', 'Think about subject-verb agreement', '"彼女は店に行きます"'];
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + example.join(",");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "quiz_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (editingSet) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 pb-20 relative">
        {showImportHelp && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-10 max-w-3xl w-full shadow-2xl border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <FileUp className="w-8 h-8 text-indigo-600" /> CSV Import Guide
                        </h3>
                        <button onClick={() => setShowImportHelp(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="space-y-6 text-slate-600 mb-8 text-lg">
                        <p>Upload a <strong>.csv</strong> file with the following columns (order matters):</p>
                        <div className="bg-slate-100 p-6 rounded-xl overflow-x-auto font-mono text-sm text-slate-700 whitespace-nowrap border border-slate-200">
                            Category, Question, Opt A, Opt B, Opt C, Opt D, Answer, Explanation, Hint, Translation
                        </div>
                        <ul className="list-disc list-inside space-y-3 text-base pl-2">
                            <li><strong>Category:</strong> Group questions (e.g., "Grammar").</li>
                            <li><strong>Correct Answer:</strong> Use 'A', 'B', 'C', or 'D' (or 1-4).</li>
                            <li><strong>Hint/Translation:</strong> Optional columns at the end.</li>
                            <li><strong>Encoding:</strong> Use "CSV UTF-8" for special characters.</li>
                        </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={downloadTemplate}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors text-lg"
                        >
                            <Download className="w-6 h-6" /> Download Template
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg shadow-indigo-200 text-lg"
                        >
                            <Upload className="w-6 h-6" /> Select CSV File
                        </button>
                    </div>
                </div>
            </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <button onClick={() => setEditingSet(null)} className="p-3 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <input 
                        type="text" 
                        value={editingSet.title}
                        onChange={(e) => setEditingSet({...editingSet, title: e.target.value})}
                        className="text-4xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-slate-300"
                        placeholder="Quiz Set Title"
                    />
                    <input 
                        type="text" 
                        value={editingSet.description}
                        onChange={(e) => setEditingSet({...editingSet, description: e.target.value})}
                        className="text-lg text-slate-500 bg-transparent border-none focus:ring-0 p-0 w-full mt-2 placeholder-slate-300"
                        placeholder="Add a short description..."
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                    onClick={() => setShowImportHelp(true)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-base"
                >
                    <FileUp className="w-5 h-5" /> Import CSV
                </button>
                <button 
                    onClick={handleSaveSet}
                    className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-100 text-base"
                >
                    <Save className="w-5 h-5" /> Save Set
                </button>
            </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
            {editingSet.questions.map((q, idx) => (
                <div key={q.id} className="p-8 rounded-3xl border border-slate-200 bg-slate-50/50 relative group transition-all hover:border-indigo-200 hover:shadow-md">
                    <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removeQuestion(idx)} className="text-slate-400 hover:text-rose-500 p-2">
                            <Trash2 className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-200">
                            {idx + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="sm:col-span-2">
                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-xl"
                                    placeholder="Question Text"
                                />
                            </div>
                            <div>
                                <input
                                    list={`areas-${idx}`}
                                    value={q.area}
                                    onChange={(e) => updateQuestion(idx, 'area', e.target.value)}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-bold text-indigo-900 text-lg"
                                    placeholder="Category (e.g. Grammar)"
                                />
                                <datalist id={`areas-${idx}`}>
                                    {existingAreas.map(a => <option key={a} value={a} />)}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ml-14">
                        {q.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-3">
                                <input 
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={q.correctOptionId === opt.id}
                                    onChange={() => updateQuestion(idx, 'correctOptionId', opt.id)}
                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                    className={`flex-1 px-4 py-3 rounded-xl border outline-none text-lg transition-colors ${q.correctOptionId === opt.id ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 focus:border-indigo-300'}`}
                                    placeholder={`Option ${optIdx + 1}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 ml-14 grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Explanation (Full Width on Mobile, Half on Desktop) */}
                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Explanation</label>
                            <textarea
                                value={q.explanation || ''}
                                onChange={(e) => updateQuestion(idx, 'explanation', e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-base"
                                rows={3}
                                placeholder="Explain why this answer is correct..."
                            />
                             <div className="flex items-start gap-3 mt-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <p>Supports Markdown and <code>&lt;br&gt;</code> for line breaks.</p>
                            </div>
                         </div>

                         {/* Hint */}
                         <div>
                             <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Hint (Optional)</label>
                             <textarea
                                value={q.hint || ''}
                                onChange={(e) => updateQuestion(idx, 'hint', e.target.value)}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-base"
                                rows={2}
                                placeholder="A helpful clue..."
                            />
                         </div>

                         {/* Translation */}
                         <div>
                             <label className="block text-sm font-bold text-slate-400 uppercase mb-2">Translation (Optional)</label>
                             <textarea
                                value={q.translation || ''}
                                onChange={(e) => updateQuestion(idx, 'translation', e.target.value)}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-base"
                                rows={2}
                                placeholder="Japanese translation of the question..."
                            />
                         </div>
                    </div>
                </div>
            ))}

            <button 
                onClick={addQuestion}
                className="w-full py-6 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 text-xl"
            >
                <Plus className="w-6 h-6" /> Add Question
            </button>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="w-full mx-auto pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-lg mb-6">
         <ArrowLeft className="w-5 h-5" /> Back to Admin Dashboard
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
            <h2 className="text-4xl font-bold text-slate-800">Quiz Content</h2>
            <p className="text-slate-500 mt-2 text-xl">Manage your problem sets.</p>
        </div>
        <button 
            onClick={handleCreateSet}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-indigo-200 transition-all text-lg"
        >
            <Plus className="w-6 h-6" /> Create New Set
        </button>
      </div>

      <div className="grid gap-6">
        {sets.map(set => (
            <div key={set.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-colors">
                <div>
                    <h3 className="font-bold text-2xl text-slate-800 mb-2">{set.title}</h3>
                    <p className="text-slate-500 text-lg mb-4">{set.description}</p>
                    <div className="flex items-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <span className="bg-slate-100 px-3 py-1.5 rounded-lg">{set.questions.length} Questions</span>
                        <span>Updated: {new Date(set.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 pl-6">
                    <button 
                        onClick={() => handleEditSet(set)}
                        className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors"
                        title="Edit"
                    >
                        <Edit3 className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={() => handleDeleteSet(set.id)}
                        className="p-4 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </div>
        ))}
        {sets.length === 0 && (
            <div className="text-center py-24 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-300">
                    <FileUp className="w-10 h-10" />
                </div>
                <p className="font-medium text-2xl">No quiz sets found.</p>
                <p className="text-lg mt-2">Create one or ask your administrator.</p>
            </div>
        )}
      </div>
    </div>
  );
};