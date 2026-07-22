import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Clock,
  MapPin,
  FileText,
  StickyNote,
} from "lucide-react";
import type { NewScheduleItem, ScheduleKind } from "../../types";

/* ============================================================
   Constants
   ============================================================ */
const KIND_OPTIONS: { value: ScheduleKind; label: string }[] = [
  { value: "arrival", label: "抵达" },
  { value: "food", label: "餐饮" },
  { value: "train", label: "铁路" },
  { value: "other", label: "其他" },
];

const INITIAL_FORM: Omit<NewScheduleItem, "dayId"> = {
  time: "",
  title: "",
  location: "",
  kind: "other",
  detail: "",
  notes: "",
};

/* ============================================================
   Validation
   ============================================================ */
interface FormErrors {
  time?: string;
  title?: string;
  location?: string;
}

function validate(form: typeof INITIAL_FORM): FormErrors {
  const errors: FormErrors = {};
  if (!form.time.trim()) errors.time = "请填写时间";
  if (!form.title.trim()) errors.title = "请填写标题";
  if (!form.location.trim()) errors.location = "请填写地点";
  return errors;
}

/* ============================================================
   Props
   ============================================================ */
interface AddScheduleDialogProps {
  open: boolean;
  dayId: string;
  onClose: () => void;
  onAdd: (item: NewScheduleItem) => void;
}

/* ============================================================
   AddScheduleDialog
   ============================================================ */
export function AddScheduleDialog({
  open,
  dayId,
  onClose,
  onAdd,
}: AddScheduleDialogProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  /* ---- Reset form when dialog opens ---- */
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setErrors({});
      setTouched({});
      // Focus first input after animation frame
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    }
  }, [open]);

  /* ---- Escape key ---- */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ---- Update single field ---- */
  const updateField = useCallback(
    <K extends keyof typeof INITIAL_FORM>(field: K, value: (typeof INITIAL_FORM)[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        const next = { ...form, [field]: value };
        if (field === "time" || field === "title" || field === "location") {
          const fieldErrors = validate(next);
          setErrors((prev) => {
            const updated = { ...prev };
            if (fieldErrors[field as keyof FormErrors]) {
              updated[field as keyof FormErrors] = fieldErrors[field as keyof FormErrors];
            } else {
              delete updated[field as keyof FormErrors];
            }
            return updated;
          });
        }
      }
    },
    [form, touched]
  );

  /* ---- Blur: mark touched + validate ---- */
  const handleBlur = useCallback(
    (field: keyof FormErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validate(form);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldErrors[field]) {
          updated[field] = fieldErrors[field];
        } else {
          delete updated[field];
        }
        return updated;
      });
    },
    [form]
  );

  /* ---- Submit ---- */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const fieldErrors = validate(form);
      setErrors(fieldErrors);
      setTouched({ time: true, title: true, location: true });
      if (Object.keys(fieldErrors).length === 0) {
        onAdd({ ...form, dayId });
      }
    },
    [form, dayId, onAdd]
  );

  /* ---- Backdrop click ---- */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="dialog-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="添加安排"
    >
      <div className="dialog-panel">
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">添加安排</h2>
          <button
            type="button"
            className="dialog-close-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            <X />
          </button>
        </div>

        {/* Form */}
        <form className="dialog-form" onSubmit={handleSubmit} noValidate>
          {/* Time */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-time">
              <Clock size={16} />
              <span>时间</span>
              <span className="dialog-required">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="add-time"
              className={"dialog-input" + (errors.time && touched.time ? " dialog-input--error" : "")}
              type="text"
              placeholder="例如: 09:40"
              value={form.time}
              onChange={(e) => updateField("time", e.target.value)}
              onBlur={() => handleBlur("time")}
            />
            {errors.time && touched.time && (
              <span className="dialog-error">{errors.time}</span>
            )}
          </div>

          {/* Title */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-title">
              <FileText size={16} />
              <span>标题</span>
              <span className="dialog-required">*</span>
            </label>
            <input
              id="add-title"
              className={"dialog-input" + (errors.title && touched.title ? " dialog-input--error" : "")}
              type="text"
              placeholder="例如: 抵达大阪"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              onBlur={() => handleBlur("title")}
            />
            {errors.title && touched.title && (
              <span className="dialog-error">{errors.title}</span>
            )}
          </div>

          {/* Location */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-location">
              <MapPin size={16} />
              <span>地点</span>
              <span className="dialog-required">*</span>
            </label>
            <input
              id="add-location"
              className={"dialog-input" + (errors.location && touched.location ? " dialog-input--error" : "")}
              type="text"
              placeholder="例如: 关西国际机场"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              onBlur={() => handleBlur("location")}
            />
            {errors.location && touched.location && (
              <span className="dialog-error">{errors.location}</span>
            )}
          </div>

          {/* Kind */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-kind">
              类型
            </label>
            <select
              id="add-kind"
              className="dialog-input dialog-select"
              value={form.kind}
              onChange={(e) => updateField("kind", e.target.value as ScheduleKind)}
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detail */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-detail">
              <FileText size={16} />
              <span>详情</span>
            </label>
            <input
              id="add-detail"
              className="dialog-input"
              type="text"
              placeholder="例如: 航班 NH17 · 到达大厅 1F"
              value={form.detail}
              onChange={(e) => updateField("detail", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="add-notes">
              <StickyNote size={16} />
              <span>备注</span>
            </label>
            <textarea
              id="add-notes"
              className="dialog-input dialog-textarea"
              rows={3}
              placeholder="添加备注信息..."
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="dialog-actions">
            <button type="button" className="dialog-btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="dialog-btn-submit">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}