export interface PackingTemplate {
  id: string;
  name: string;
  items: string[];
}

export const defaultPackingTemplates: PackingTemplate[] = [
  { id: "overseas", name: "海外旅行", items: ["护照", "转换插头", "充电宝"] },
  { id: "weekend", name: "国内周末", items: ["身份证", "充电线", "换洗衣物"] },
  { id: "island", name: "海岛", items: ["防晒霜", "泳衣", "墨镜"] },
  { id: "camping", name: "露营", items: ["帐篷", "手电筒", "急救包"] },
  { id: "business", name: "商务出差", items: ["电脑", "名片", "正装"] },
];

const storageKey = "travel-planner:packing-templates:v1";
const cloneDefaults = () => defaultPackingTemplates.map((template) => ({ ...template, items: [...template.items] }));

export function loadPackingTemplates(storage: Pick<Storage, "getItem"> = localStorage): PackingTemplate[] {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return cloneDefaults();
    const templates = parsed.filter((value): value is PackingTemplate => Boolean(value && typeof value === "object" && typeof (value as PackingTemplate).id === "string" && typeof (value as PackingTemplate).name === "string" && Array.isArray((value as PackingTemplate).items))).map((template) => ({ ...template, name: template.name.trim(), items: template.items.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) })).filter((template) => template.name && template.items.length);
    return templates.length || parsed.length === 0 ? templates : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

export function savePackingTemplates(templates: PackingTemplate[], storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(storageKey, JSON.stringify(templates));
}
