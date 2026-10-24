import {describe, expect, it} from 'vitest';
import markdown from '../../COMPONENTS.md?raw';
import {parseCatalog} from '../catalog';

describe('parseCatalog', () => {
  const groups = parseCatalog(markdown);
  const byId = new Map(groups.flatMap((g) => g.entries).map((e) => [e.id, e]));

  it('reads every group in COMPONENTS.md', () => {
    expect(groups.map((g) => g.title)).toEqual([
      'Foundations',
      'Actions',
      'Communication',
      'Containment',
      'Selection and input',
      'Navigation',
      'Layout helpers',
    ]);
  });

  it('reads 11 foundations and 44 components', () => {
    expect(groups[0].entries).toHaveLength(11);
    expect(groups.slice(1).flatMap((g) => g.entries)).toHaveLength(44);
  });

  it('reads names, elements, generation and status from differently shaped tables', () => {
    expect(byId.get('0.1')).toMatchObject({
      name: expect.stringMatching(/^Design tokens/),
      status: 'done',
    });
    expect(byId.get('0.3')).toMatchObject({status: 'done', gen: 'M3E'});
    expect(byId.get('1.3')).toMatchObject({
      name: 'Icon button',
      elements: ['rx-icon-button'],
      gen: 'M3 + M3E',
      status: 'done',
    });
    expect(byId.get('1.4')).toMatchObject({
      name: 'Button group',
      elements: ['rx-button-group'],
      gen: 'M3E',
      status: 'progress',
      note: expect.stringMatching(/step 58/),
    });
    expect(byId.get('1.5')).toMatchObject({
      name: 'Split button',
      elements: ['rx-split-button'],
      status: 'done',
    });
    expect(byId.get('1.6')).toMatchObject({
      name: 'Segmented button',
      elements: ['rx-segmented-button', 'rx-segmented-button-set'],
      status: 'done',
    });
    expect(byId.get('1.7')).toMatchObject({name: 'FAB', status: 'todo'});
    expect(byId.get('1.10')?.elements).toContain('rx-chip-set');
    expect(byId.get('6.1')).toMatchObject({name: 'Scaffold', elements: ['rx-scaffold']});
  });

  it('reads an in-progress status with its note', () => {
    const table = [
      '## 0. Foundations',
      '',
      '| #   | Item | Web output | Compose | MDC | Gen | Status   |',
      '| --- | --------- | -------- | ------- | --- | --- | -------- |',
      '| 0.1 | Motion    | `rx-foo` | `A.kt`  | `a/` | M3E | ◐ tokens only |',
    ].join('\n');
    const [entry] = parseCatalog(table)[0].entries;
    expect(entry).toMatchObject({status: 'progress', note: 'tokens only', gen: 'M3E'});
  });
});
