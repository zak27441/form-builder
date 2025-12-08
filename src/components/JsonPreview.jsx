import React from 'react';

const JsonPreview = ({ data }) => {
  const cleanField = (field, index) => {
      const type = field.type.toLowerCase();
      const isStatic = ['heading', 'fixed text'].includes(type);
      
      const clean = {
        id: field.id,
        position: index + 1,
        type: field.type,
        label: field.label,
      };

      if (!isStatic) {
        clean.mandatory = field.mandatory;
        clean.fma = field.fma;
        if (field.tiptext) clean.tiptext = field.tiptext;
      }

      if (['dropdown', 'radio buttons', 'checkbox'].includes(type)) {
        clean.options = field.options;
        clean.multiselect = field.multiselect;
      }

      if (type === 'text field') {
        clean.numbersOnly = field.numbersOnly;
      }

      if (type === 'phone number') {
        clean.allowInternational = field.allowInternational;
      }
      
      if (type === 'fixed text') {
         clean.bold = field.bold;
      }

      if (type === 'repeater') {
        clean.maxEntries = field.maxEntries;
        clean.repeaterButtonLabel = field.repeaterButtonLabel;
        if (field.children && field.children.length > 0) {
            clean.children = field.children.map((child, i) => cleanField(child, i));
        }
      }

      if (field.conditional) {
        const { triggerId, logicType, value1, value2, selectedOptions } = field.conditional;
        const cleanCond = { triggerId };
        
        if (selectedOptions && selectedOptions.length > 0) {
            cleanCond.selectedOptions = selectedOptions;
        } else {
            if (logicType) cleanCond.logicType = logicType;
            if (value1) cleanCond.value1 = value1;
            if (value2) cleanCond.value2 = value2;
        }
        clean.conditional = cleanCond;
      }

      return clean;
  };

  const cleanFields = (data || []).map((field, index) => cleanField(field, index));

  const json = JSON.stringify(cleanFields, null, 2);
  
  // Regex for simple JSON syntax highlighting
  const highlightedJson = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let className = "text-[#ce9178]"; // String value (Reddish/Orange)
      
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          className = "text-[#9cdcfe]"; // Key (Light Blue)
        } else {
          className = "text-[#ce9178]"; // String (Reddish/Orange)
        }
      } else if (/true|false/.test(match)) {
        className = "text-[#569cd6]"; // Boolean (Blue)
      } else if (/null/.test(match)) {
        className = "text-[#569cd6]"; // Null (Blue)
      } else {
        className = "text-[#b5cea8]"; // Number (Light Green)
      }
      
      return `<span class="${className}">${match}</span>`;
    }
  );

  return (
    <div className="flex-1 bg-[#1e1e1e] rounded-xl shadow-2xl h-[calc(100vh-140px)] overflow-hidden flex flex-col border border-[#333]">
        <div className="bg-[#2d2d2d] px-4 py-3 text-xs text-gray-400 border-b border-[#1e1e1e] flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"/>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"/>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"/>
                </div>
                <span className="ml-3 font-mono text-gray-300">schema.json</span>
            </div>
            <div className="text-[10px] text-gray-500">JSON Mode</div>
        </div>
        <pre 
            className="flex-1 p-6 overflow-auto font-mono text-sm text-[#d4d4d4] leading-6 custom-scrollbar bg-[#1e1e1e]"
            dangerouslySetInnerHTML={{ __html: highlightedJson }}
        />
    </div>
  );
};

export default JsonPreview;
