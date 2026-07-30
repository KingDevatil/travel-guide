import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { importBackup } from "./import-trip";

export function ImportBackupButton({
  onImported,
  label = "导入备份",
  className,
}: {
  onImported: (tripId: string) => void;
  label?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  return <>
    <button className={className} disabled={importing} onClick={() => input.current?.click()}>
      <Upload aria-hidden="true" /> {importing ? "正在导入…" : label}
    </button>
    <input
      ref={input}
      type="file"
      accept="application/json"
      hidden
      onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setImporting(true);
        try {
          const id = await importBackup(await file.text());
          setMessage("导入成功，已创建一份本机副本。");
          onImported(id);
        } catch {
          setMessage("导入失败：请选择由旅程册导出的 JSON 备份。");
        } finally {
          setImporting(false);
        }
      }}
    />
    {message && <p className="import-backup-message" role="status">{message}</p>}
  </>;
}

