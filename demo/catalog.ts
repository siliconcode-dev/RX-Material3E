// Reads the component catalog straight from COMPONENTS.md so the demo index
// never drifts from the planning document.

export type Status = 'todo' | 'progress' | 'done';

export interface CatalogEntry {
  /** Catalog number, e.g. "1.3". */
  id: string;
  name: string;
  /** Planned element tags or outputs, e.g. ["rx-icon-button"]. */
  elements: string[];
  /** "M3", "M3E" or "M3 + M3E". */
  gen: string;
  status: Status;
  /** Free text after the status mark, e.g. "tokens only". */
  note: string;
}

export interface CatalogGroup {
  title: string;
  entries: CatalogEntry[];
}

const STATUS: Record<string, Status> = {'☐': 'todo', '◐': 'progress', '☑': 'done'};

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function parseCatalog(markdown: string): CatalogGroup[] {
  const groups: CatalogGroup[] = [];
  let group: CatalogGroup | undefined;
  let header: string[] | undefined;

  for (const line of markdown.split('\n')) {
    const heading = /^## \d+\. (.+)$/.exec(line);
    if (heading) {
      group = {title: heading[1], entries: []};
      groups.push(group);
      header = undefined;
      continue;
    }
    if (!group || !line.startsWith('|')) {
      if (!line.startsWith('|')) header = undefined;
      continue;
    }
    const row = cells(line);
    if (!header) {
      header = row;
      continue;
    }
    if (row.every((c) => /^-+$/.test(c))) continue;

    const col = (...names: string[]) => row[header!.findIndex((h) => names.includes(h))] ?? '';
    const status = col('Status');
    group.entries.push({
      id: col('#'),
      name: col('Item', 'Component'),
      elements: [...col('Web output', 'Web element(s)').matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      gen: col('Gen'),
      status: STATUS[status.charAt(0)] ?? 'todo',
      note: status.slice(1).trim(),
    });
  }
  return groups.filter((g) => g.entries.length > 0);
}
