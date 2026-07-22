import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { PackingTemplate } from "./templates";

interface PackingTemplateManagerProps {
  templates: PackingTemplate[];
  onChange: (templates: PackingTemplate[]) => void;
  onClose: () => void;
}

export function PackingTemplateManager({ templates, onChange, onClose }: PackingTemplateManagerProps) {
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [error, setError] = useState("");

  const startNew = () => { setEditingId(""); setName(""); setItemsText(""); setError(""); };
  const startEdit = (template: PackingTemplate) => { setEditingId(template.id); setName(template.name); setItemsText(template.items.join("\n")); setError(""); };
  const cancelEdit = () => { setEditingId(undefined); setError(""); };
  const save = () => {
    const nextName = name.trim();
    const nextItems = [...new Set(itemsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
    if (!nextName || nextItems.length === 0) { setError("请填写模板名称，并至少保留一个物品。"); return; }
    if (templates.some((template) => template.id !== editingId && template.name === nextName)) { setError("模板名称不能重复。"); return; }
    const template: PackingTemplate = { id: editingId || crypto.randomUUID(), name: nextName, items: nextItems };
    onChange(editingId ? templates.map((current) => current.id === editingId ? template : current) : [...templates, template]);
    setEditingId(undefined);
  };

  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="packing-template-title">
    <section className="dialog-panel packing-template-manager">
      <div className="dialog-header"><div><h2 id="packing-template-title" className="dialog-title">管理行李模板</h2><p>模板保存在当前浏览器，可修改名称和物品内容。</p></div><button type="button" className="dialog-close-btn" onClick={onClose} aria-label="关闭模板管理"><X aria-hidden="true" /></button></div>
      {editingId === undefined ? <>
        <div className="template-manager-list">{templates.map((template) => <article key={template.id}><div><strong>{template.name}</strong><span>{template.items.join("、")}</span></div><div><button type="button" onClick={() => startEdit(template)} aria-label={`编辑 ${template.name}`}><Pencil aria-hidden="true" />编辑</button><button type="button" className="danger-action" onClick={() => onChange(templates.filter((current) => current.id !== template.id))} aria-label={`删除 ${template.name}`}><Trash2 aria-hidden="true" />删除</button></div></article>)}</div>
        <button type="button" className="template-create-btn" onClick={startNew}><Plus aria-hidden="true" />新建模板</button>
      </> : <div className="template-edit-form">
        <label className="dialog-field">模板名称<input className="dialog-input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：亲子旅行" /></label>
        <label className="dialog-field">模板物品（每行一项）<textarea className="dialog-input dialog-textarea" value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={'证件\n衣物\n常用药'} /></label>
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="dialog-btn-cancel" onClick={cancelEdit}>取消</button><button type="button" className="dialog-btn-submit" onClick={save}>保存模板</button></div>
      </div>}
    </section>
  </div>;
}
