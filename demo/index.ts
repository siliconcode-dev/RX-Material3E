import markdown from '../COMPONENTS.md?raw';
import {parseCatalog, type CatalogEntry, type Status} from './catalog';

const LABEL: Record<Status, string> = {todo: 'Not started', progress: 'In progress', done: 'Done'};

function row(entry: CatalogEntry) {
  const tr = document.createElement('tr');
  const cell = (content: Node | string) => {
    const td = document.createElement('td');
    td.append(content);
    tr.append(td);
  };
  cell(entry.id);
  cell(entry.name);
  const tags = document.createElement('span');
  entry.elements.forEach((tag, i) => {
    if (i) tags.append(', ');
    tags.append(Object.assign(document.createElement('code'), {textContent: tag}));
  });
  cell(tags);
  cell(entry.gen);
  const status = Object.assign(document.createElement('span'), {
    className: `status status-${entry.status}`,
    textContent: entry.note ? `${LABEL[entry.status]} (${entry.note})` : LABEL[entry.status],
  });
  cell(status);
  return tr;
}

const groups = parseCatalog(markdown);
const all = groups.flatMap((g) => g.entries);
const done = all.filter((e) => e.status === 'done').length;
document.getElementById('summary')!.textContent =
  `${all.length} items in ${groups.length} groups. ${done} done. ` +
  'Read straight from COMPONENTS.md, so it always matches the plan.';

const container = document.getElementById('catalog')!;
for (const group of groups) {
  const table = document.createElement('table');
  table.className = 'catalog-table';
  table.createTHead().innerHTML =
    '<tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Web output</th>' +
    '<th scope="col">Gen</th><th scope="col">Status</th></tr>';
  table.createTBody().append(...group.entries.map(row));
  const scroll = Object.assign(document.createElement('div'), {className: 'catalog-scroll'});
  scroll.append(table);
  container.append(Object.assign(document.createElement('h2'), {textContent: group.title}), scroll);
}
