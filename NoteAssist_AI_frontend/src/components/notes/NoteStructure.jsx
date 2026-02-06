import { useState } from 'react';
import { 
  Plus, Edit, Trash2, 
  FileText, Code, Link, Wand2, Save, X
} from 'lucide-react';

const NoteStructure = ({ note, onUpdate }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (type, id, currentValue) => {
    setEditingItem({ type, id });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editValue.trim()) {
      cancelEdit();
      return;
    }
    
    // Call the update handler with the correct structure
    if (editingItem.type === 'chapter') {
      await onUpdate('chapter', { id: editingItem.id, title: editValue });
    } else if (editingItem.type === 'topic') {
      await onUpdate('topic', { id: editingItem.id, name: editValue });
    }
    cancelEdit();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-5">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          📚 Note Structure
        </h3>
        <button 
          onClick={() => onUpdate('add-chapter')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Add New Chapter
        </button>
      </div>

      {/* Chapters List */}
      <div className="space-y-2">
        {note.chapters?.map((chapter, index) => (
          <div 
            key={chapter.id}
            className="animate-fadeIn"
            style={{
              animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
            }}
          >
            {/* Chapter Header */}
            <div className="group border dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200">
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-gray-600 dark:hover:to-gray-600 transition-all duration-200">
                
                <FileText size={18} className="text-blue-600 dark:text-blue-400" />

                {/* Chapter Title or Edit Input */}
                {editingItem?.type === 'chapter' && editingItem?.id === chapter.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1 px-3 py-1.5 text-sm border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded transition"
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-semibold text-sm text-gray-800 dark:text-gray-100">
                      {chapter.title}
                    </span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {chapter.topics?.length || 0} topics
                    </span>

                    {/* Chapter Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit('chapter', chapter.id, chapter.title);
                        }}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition"
                        title="Edit Chapter"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate('delete-chapter', chapter.id);
                        }}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 rounded transition"
                        title="Delete Chapter"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Topics List - Always Visible */}
              <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                  {chapter.topics?.map((topic, topicIndex) => (
                    <div
                      key={topic.id}
                      className="group flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:shadow-md dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
                      onClick={() => onUpdate('select-topic', topic.id)}
                      style={{
                        animation: `fadeIn 0.2s ease-out ${topicIndex * 0.05}s both`
                      }}
                    >
                      <div className="text-lg">📄</div>

                      {/* Topic Title or Edit Input */}
                      {editingItem?.type === 'topic' && editingItem?.id === topic.id ? (
                        <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="flex-1 px-3 py-1.5 text-sm border-2 border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={saveEdit}
                            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded transition"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                            {topic.name}
                          </span>

                          {/* Topic Indicators */}
                          <div className="flex items-center gap-1.5">
                            {topic.has_explanation && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium flex items-center gap-1" title="Has explanation">
                                <FileText size={12} /> Content
                              </span>
                            )}
                            {topic.has_code && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1" title="Has code">
                                <Code size={12} /> Code
                              </span>
                            )}
                            {topic.has_source && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium flex items-center gap-1" title="Has source">
                                <Link size={12} /> Link
                              </span>
                            )}
                          </div>

                          {/* Topic Action Buttons */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit('topic', topic.id, topic.name);
                              }}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition"
                              title="Edit Topic"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdate('ai-topic', topic.id);
                              }}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-400 rounded transition" 
                              title="AI Actions"
                            >
                              <Wand2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdate('delete-topic', topic.id);
                              }}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 rounded transition"
                              title="Delete Topic"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add Topic Button - Always Visible */}
                  <button 
                    onClick={() => onUpdate('add-topic', chapter.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600 transition-all duration-200 transform hover:scale-[1.01]"
                  >
                    <Plus size={16} />
                    Add Topic to "{chapter.title}"
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!note.chapters || note.chapters.length === 0) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No chapters yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Click "Add New Chapter" to get started creating your notes structure</p>
        </div>
      )}
    </div>
  );
};

export default NoteStructure;