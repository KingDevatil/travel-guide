import { useState } from "react";
import { Copy, Download, Printer } from "lucide-react";
import type { Trip } from "../../domain/models";
import { downloadBackup, exportTrip } from "./export-trip";
import { ImportBackupButton } from "./ImportBackupButton";

function shareSummary(trip: Trip): string {
  return [
    `【${trip.title}】`,
    trip.destination ? `目的地：${trip.destination}` : undefined,
    `日期：${trip.startDate} 至 ${trip.endDate}`,
    `默认币种：${trip.defaultCurrency}`,
    "详细安排可从旅程册导出行程单或 JSON 备份后分享。",
  ].filter(Boolean).join("\n");
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

export function BackupPanel({ trip, onImported }: { trip: Trip; onImported: (tripId: string) => void }) {
  const [message, setMessage] = useState("");
  const key = `travel-backup-${trip.id}`;
  const [lastExport, setLastExport] = useState(() => localStorage.getItem(key));
  const needsBackup = !lastExport || lastExport < trip.updatedAt;
  return <section className="backup-panel">
    <h3>备份、恢复与分享</h3>
    <p>数据仅保存在本机。JSON 备份用于恢复完整数据，行程摘要适合发送给同行人。</p>
    {needsBackup && <p className="backup-reminder" role="status">行程在最近一次备份后有更新，请导出最新副本。</p>}
    <div className="backup-panel__actions">
      <button onClick={() => void exportTrip(trip).then((backup) => {
        downloadBackup(backup);
        const now = new Date().toISOString();
        localStorage.setItem(key, now);
        setLastExport(now);
        setMessage("完整备份已下载。");
      })}><Download aria-hidden="true" /> 导出完整备份</button>
      <ImportBackupButton onImported={onImported} />
      <button onClick={() => void copyText(shareSummary(trip))
        .then(() => setMessage("行程摘要已复制，可发送给同行人。"))
        .catch(() => setMessage("复制失败，请检查浏览器剪贴板权限。"))}>
        <Copy aria-hidden="true" /> 复制分享摘要
      </button>
      <button onClick={() => window.print()}><Printer aria-hidden="true" /> 打印行程</button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
