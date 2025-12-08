import React, { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { Calendar, CheckCircle, Download, FileText, FileSpreadsheet } from 'lucide-react'; 
import { cn } from '../utils/cn';

const ControlPanel = ({ onSave, mode, setMode, subMode, setSubMode, selectedJourney, isDirty, fields }) => {
  const [showToast, setShowToast] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleSaveClick = () => {
    onSave();
    
    setShowToast(true);
    requestAnimationFrame(() => setIsVisible(true));

    setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setShowToast(false), 500);
    }, 1500);
  };

  const handleDownloadJson = () => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const status = isDirty ? "unsaved" : "saved";
      
      // Filename: "Journey - DD Month YYYY - saved - [HH:mm.ss].json"
      const filename = `${selectedJourney || "Journey"} - ${day} ${month} ${year} - ${status} - [${hours}:${minutes}.${seconds}].json`;
      
      // Clean fields logic for JSON output
      const cleanFields = (fields || []).map((field, index) => {
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
          }

          if (field.conditional) {
            const { triggerId, logicType, value1, value2, selectedOptions } = field.conditional;
            const cleanCond = { triggerId };
            
            // If it has selectedOptions (choice logic), show those. 
            // Otherwise show logicType/values (number/date logic).
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
      });

      const exportData = {
        metadata: { journey: selectedJourney || "Journey", timestamp: date.toISOString(), schemaVersion: "1.0" },
        schema: cleanFields
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (targetSubMode) => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const status = isDirty ? "unsaved" : "saved";
      
      const title = `${selectedJourney || "Journey"} - ${day} ${month} ${year} - ${status} - [${hours}:${minutes}.${seconds}]`;

      const fieldsToPrint = (fields || []).filter(f => {
          if (targetSubMode === 'DIP' && f.fma) return false;
          return true;
      });

      const printContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                h1 { font-size: 24px; margin-bottom: 10px; }
                .meta { font-size: 12px; color: #666; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .field { margin-bottom: 20px; page-break-inside: avoid; }
                .label { font-size: 12px; font-weight: bold; margin-bottom: 5px; display: block; color: #444; }
                .input-box { border: 1px solid #ccc; height: 30px; width: 100%; border-radius: 4px; background: #f9f9f9; }
                .heading { font-size: 18px; font-weight: bold; border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; color: #000; }
                .checkbox { display: inline-block; width: 12px; height: 12px; border: 1px solid #666; margin-right: 5px; background: white; }
                .option { display: flex; align-items: center; margin-bottom: 4px; font-size: 12px; }
                .tip { font-size: 10px; font-weight: bold; margin-top: 2px; color: #000; }
            </style>
        </head>
        <body>
            <h1>${selectedJourney || "Journey"} (${targetSubMode})</h1>
            <div class="meta">Generated: ${day} ${month} ${year} at ${hours}:${minutes}:${seconds}</div>
            
            ${fieldsToPrint.map(f => {
                const type = f.type.toLowerCase();
                if (type === 'heading') return `<div class="heading">${f.label}</div>`;
                if (type === 'fixed text') return `<div class="field" style="font-weight:${f.bold?'bold':'normal'}; font-size: 11px;">${f.label}</div>`;
                
                let inputHtml = '<div class="input-box"></div>';
                
                if (type === 'text area') inputHtml = '<div class="input-box" style="height:80px"></div>';
                if (['checkbox', 'radio buttons'].includes(type)) {
                    inputHtml = (f.options || []).map(opt => `
                        <div class="option"><span class="checkbox" style="border-radius:${type==='radio buttons'?'50%':'2px'}"></span> ${opt}</div>
                    `).join('');
                }
                if (type === 'currency') inputHtml = '<div style="position:relative"><span style="position:absolute;left:8px;top:6px;font-size:12px">£</span><div class="input-box" style="padding-left:20px"></div></div>';

                return `
                    <div class="field">
                        <span class="label">${f.label}${f.mandatory ? ' *' : ''}</span>
                        ${inputHtml}
                        ${f.tiptext ? `<div class="tip">${f.tiptext}</div>` : ''}
                    </div>
                `;
            }).join('')}
            
            <script>
                window.print();
            </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
      }
  };

  const handleSpreadsheetDownload = (type) => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      // Updated title to include journey name as requested
      const title = `${selectedJourney || "Journey"} - Specs - ${day} ${month} ${year}`;

      if (type === 'pdf') {
          // Map exact Tailwind colors to CSS
          const getTypeStyle = (t) => {
             switch(t.toLowerCase()) {
                 case 'text field': return 'background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;';
                 case 'currency': return 'background:#dcfce7;color:#166534;border:1px solid #bbf7d0;';
                 case 'text area': return 'background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;';
                 case 'dropdown': return 'background:#f3e8ff;color:#6b21a8;border:1px solid #e9d5ff;';
                 case 'radio buttons': return 'background:#fce7f3;color:#9d174d;border:1px solid #fbcfe8;';
                 case 'checkbox': return 'background:#ffe4e6;color:#be123c;border:1px solid #fecdd3;';
                 case 'heading': return 'background:#e5e7eb;color:#1f2937;border:1px solid #d1d5db;';
                 case 'fixed text': return 'background:#f1f5f9;color:#1e293b;border:1px solid #e2e8f0;';
                 case 'calendar': return 'background:#ffedd5;color:#9a3412;border:1px solid #fed7aa;';
                 case 'address group': return 'background:#ccfbf1;color:#115e59;border:1px solid #99f6e4;';
                 case 'repeater': return 'background:#cffafe;color:#155e75;border:1px solid #a5f3fc;';
                 case 'sort code': return 'background:#ecfccb;color:#3f6212;border:1px solid #d9f99d;';
                 case 'account number': return 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;';
                 case 'phone number': return 'background:#e0f2fe;color:#075985;border:1px solid #bae6fd;';
                 default: return 'background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb;';
             }
          };

          const html = `
            <html><head><title>${title}</title>
            <style>
                @page { size: landscape; margin: 1cm; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                    padding: 20px; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                h1 { margin-bottom: 20px; font-size: 20px; color: #374151; letter-spacing: 0.05em; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e5e7eb; table-layout: fixed; }
                th { 
                    background-color: #f3f4f6 !important; /* Updated color */
                    padding: 4px 8px; 
                    border: 1px solid #d1d5db; 
                    text-align: left; 
                    color: #4b5563; 
                    font-weight: bold; 
                    font-size: 9px;
                    white-space: normal;
                }
                td { 
                    padding: 4px 8px; 
                    border: 1px solid #e5e7eb; 
                    vertical-align: middle; 
                    color: #1f2937; 
                    word-wrap: break-word; 
                    white-space: normal;
                    font-size: 9px;
                }
                .chip { 
                    display: inline-flex; 
                    align-items: center; 
                    padding: 2px 8px; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    font-size: 10px; 
                    text-transform: capitalize; 
                    white-space: normal; 
                    text-align: center;
                }
                .heading-row { background-color: #e5e7eb !important; }
                .heading-label { 
                    color: #111827; 
                    font-weight: bold; 
                    letter-spacing: 0.025em; 
                }
                .status-yes { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; display: inline-block; }
                .status-no { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; display: inline-block; }
                .opt-chip { 
                    background: #f9fafb; 
                    border: 1px solid #f3f4f6; 
                    padding: 1px 4px; 
                    border-radius: 4px; 
                    display: inline-block; 
                    margin: 1px; 
                    white-space: normal; 
                    word-break: break-word;
                    font-size: 9px;
                }
                /* Added missing broken logic styles */
                .broken-logic {
                    background-color: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #b91c1c;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: flex-start;
                    gap: 4px;
                    font-size: 9px;
                    width: 100%;
                }
                .broken-title {
                    font-weight: bold;
                    text-transform: uppercase;
                    display: block;
                    font-size: 8px;
                    margin-bottom: 2px;
                }
            </style></head><body>
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:20px">
                <h1>${selectedJourney || "Journey"} - Form Specs</h1>
                <div style="font-size:12px;color:#9ca3af;font-family:monospace">${fields.length} Fields</div>
            </div>
            <table>
                <colgroup>
                    <col style="width: 18%">
                    <col style="width: 7%">
                    <col style="width: 10%">
                    <col style="width: 7%">
                    <col style="width: 6%"> <!-- Reduced -->
                    <col style="width: 12%"> <!-- Reduced -->
                    <col style="width: 15%"> <!-- Tip Text Moved -->
                    <col style="width: 13%"> <!-- Reduced -->
                    <col style="width: 12%"> <!-- Tip Text Moved to End -->
                </colgroup>
                <thead><tr><th>Question Label</th><th>Field ID</th><th>Type</th><th>Mandatory</th><th>FMA Only</th><th>Options</th><th>Conditional Logic</th><th>Validation</th><th>Tip Text</th></tr></thead>
                <tbody>
                    ${fields.map(f => {
                        const isHeading = f.type.toLowerCase() === 'heading';
                        const typeStyle = getTypeStyle(f.type);
                        const hasOptions = ['dropdown', 'radio buttons', 'checkbox'].includes(f.type.toLowerCase());
                        
                        // Re-add Broken Logic Detection
                        const triggerExists = f.conditional ? fields.some(field => field.id === f.conditional.triggerId) : true;
                        const isBroken = f.conditional && !triggerExists;

                        let conditionalContent = '<span style="color:#d1d5db">-</span>';
                        if (f.conditional) {
                            if (isBroken) {
                                conditionalContent = `
                                    <div class="broken-logic">
                                        <span style="font-size:12px; line-height: 1">⚠</span>
                                        <div>
                                            <span class="broken-title">Broken Logic</span>
                                            Depends on missing field (ID:${f.conditional.triggerId}). Update or delete logic.
                                        </div>
                                    </div>
                                `;
                            } else {
                                conditionalContent = `ID:${f.conditional.triggerId} ${f.conditional.logicType || '='} ...`;
                            }
                        }

                        return `
                        <tr class="${isHeading ? 'heading-row' : ''}">
                            <td><div class="${isHeading ? 'heading-label' : ''}">${f.label}</div></td>
                            <td style="font-family:monospace;color:#6b7280;font-size:11px">${f.id}</td>
                            <td><span class="chip" style="${typeStyle}">${f.type}</span></td>
                            <td style="text-align:center">${f.type==='heading'||f.type==='fixed text' ? '<span style="color:#d1d5db">-</span>' : (f.mandatory ? '<span class="status-yes">YES</span>' : '<span class="status-no">NO</span>')}</td>
                            <td style="text-align:center">${f.type==='heading'||f.type==='fixed text' ? '<span style="color:#d1d5db">-</span>' : (f.fma ? '<span class="status-yes">YES</span>' : '<span class="status-no">NO</span>')}</td>
                            <td>${hasOptions && f.options ? f.options.map(o => `<span class="opt-chip">${o}</span>`).join('') : '<span style="color:#d1d5db">-</span>'}</td>
                            <td>${conditionalContent}</td>
                            <td>
                                ${f.numbersOnly?'<span class="chip" style="background:#eff6ff;color:#2563eb;border:1px solid #dbeafe">Numbers Only</span> ':''}
                                ${f.multiselect?'<span class="chip" style="background:#faf5ff;color:#9333ea;border:1px solid #f3e8ff">Multi-select</span>':''}
                            </td>
                            <td>${f.tiptext || '<span style="color:#d1d5db">-</span>'}</td>
                        </tr>`;
                    }).join('')}
                </tbody></table>
                <script>window.print();</script>
            </body></html>
          `;
          const win = window.open('','_blank');
          if(win) { win.document.write(html); win.document.close(); }
      } 
      
      if (type === 'excel') {
          const xls = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Specs</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
            <style>td { border: 0.5pt solid #ccc; vertical-align: top; } .heading { background-color: #e0e0e0; font-weight: bold; } .header { background-color: #f0f0f0; font-weight: bold; }</style>
            </head><body>
            <table>
                <thead><tr class="header"><td>Label</td><td>ID</td><td>Type</td><td>Mandatory</td><td>FMA</td><td>Options</td><td>Logic</td><td>Validation</td></tr></thead>
                <tbody>
                    ${fields.map(f => `
                        <tr class="${f.type.toLowerCase() === 'heading' ? 'heading' : ''}">
                            <td>${f.label}</td><td>${f.id}</td><td>${f.type}</td>
                            <td>${f.mandatory?'TRUE':'FALSE'}</td><td>${f.fma?'TRUE':'FALSE'}</td>
                            <td>${(f.options||[]).join(', ')}</td>
                            <td>${f.conditional ? 'Conditional' : ''}</td>
                            <td>${f.numbersOnly?'Numbers Only':''}</td>
                        </tr>
                    `).join('')}
                </tbody></table></body></html>
          `;
          const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title}.xls`;
          a.click();
          URL.revokeObjectURL(url);
      }
  };

  const modes = ["Edit", "Preview", "Spreadsheet", "JSON"];

  return (
    <div className="w-[200px] py-4 pl-4 flex flex-col gap-6 relative">
      {/* Toast */}
      {showToast && createPortal(
        <div 
            className={cn(
                "fixed top-6 right-6 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded shadow-lg flex items-center gap-2 z-[9999]",
                "transition-all duration-500 ease-in-out transform",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}
        >
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Saved successfully!</span>
        </div>,
        document.body
      )}

      <div className="space-y-2">
        <label className="text-sm text-gray-800 block">As of:</label>
        <div className="bg-gray-200 rounded-md px-3 py-2 flex items-center justify-between text-gray-500 text-sm">
          <span>DD / MM / YY</span>
          <Calendar size={16} />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm text-gray-800 block">Compare to:</label>
        <div className="bg-gray-200 rounded-md px-3 py-2 flex items-center justify-between text-gray-500 text-sm">
          <span>DD / MM / YY</span>
          <Calendar size={16} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-lg text-gray-800 block font-bold text-center mb-4">Mode</label>
        <div className="flex flex-col gap-3 mt-1">
            {modes.map(m => (
                <div key={m} className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setMode(m)}
                            className={cn(
                                "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out flex items-center px-0.5 flex-shrink-0",
                                mode === m ? "bg-green-400" : "bg-gray-300"
                            )}
                        >
                            <div 
                                className={cn(
                                    "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out transform",
                                    mode === m ? "translate-x-5" : "translate-x-0"
                                )} 
                            />
                        </button>
                        <span className="text-sm text-gray-600 font-bold">{m}</span>
                    </div>

                    {/* Animated Sub-options for Preview */}
                    {m === "Preview" && (
                        <div className={cn(
                            "flex flex-col gap-2 overflow-hidden transition-all duration-500 ease-in-out",
                            mode === "Preview" ? "max-h-24 opacity-100 mt-2 pl-4 ml-4 border-l-2 border-gray-200" : "max-h-0 opacity-0 mt-0 pl-4 ml-4 border-l-2 border-transparent"
                        )}>
                            {["DIP", "FMA"].map(sm => (
                                <div key={sm} className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setSubMode(sm)}
                                        className={cn(
                                            "w-7 h-4 rounded-full relative transition-colors duration-200 ease-in-out flex items-center px-0.5 flex-shrink-0",
                                            subMode === sm ? "bg-green-400" : "bg-gray-300"
                                        )}
                                    >
                                        <div 
                                            className={cn(
                                                "w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out transform",
                                                subMode === sm ? "translate-x-3" : "translate-x-0"
                                            )} 
                                        />
                                    </button>
                                    <span className="text-xs text-gray-500 font-bold w-8">{sm}</span>
                                    
                                    {/* Download PDF Button */}
                                    <button 
                                        onClick={() => handlePrintPdf(sm)}
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all"
                                        title={`Download ${sm} PDF`}
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Animated Sub-options for Spreadsheet */}
                    {m === "Spreadsheet" && (
                        <div className={cn(
                            "flex flex-col gap-2 overflow-hidden transition-all duration-500 ease-in-out",
                            mode === "Spreadsheet" ? "max-h-24 opacity-100 mt-2 pl-4 ml-4 border-l-2 border-gray-200" : "max-h-0 opacity-0 mt-0 pl-4 ml-4 border-l-2 border-transparent"
                        )}>
                             <button 
                                onClick={() => handleSpreadsheetDownload('pdf')}
                                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-1"
                             >
                                <FileText size={14} />
                                <span>Download PDF</span>
                             </button>
                             <button 
                                onClick={() => handleSpreadsheetDownload('excel')}
                                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-1"
                             >
                                <FileSpreadsheet size={14} />
                                <span>Download Excel</span>
                             </button>
                        </div>
                    )}

                    {/* Animated Download for JSON */}
                    {m === "JSON" && (
                        <div className={cn(
                            "flex flex-col gap-2 overflow-hidden transition-all duration-500 ease-in-out",
                            mode === "JSON" ? "max-h-24 opacity-100 mt-2 pl-4 ml-4 border-l-2 border-gray-200" : "max-h-0 opacity-0 mt-0 pl-4 ml-4 border-l-2 border-transparent"
                        )}>
                             <button 
                                onClick={handleDownloadJson}
                                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-1"
                             >
                                <Download size={14} />
                                <span>Download JSON</span>
                             </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <button 
        onClick={handleSaveClick}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors mt-4"
      >
        Save
      </button>
    </div>
  );
};

export default ControlPanel;

