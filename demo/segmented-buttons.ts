import '../packages/web/src/segmented-button/segmented-button.js';
import '../packages/web/src/segmented-button/segmented-button-set.js';
import '../packages/web/src/icon/icon.js';
import type {RxSegmentedButton} from '../packages/web/src/segmented-button/index.js';

const single = document.getElementById('single')!;
const log = document.getElementById('single-log')!;
single.addEventListener('change', (event) => {
  log.textContent = `Selected: ${(event.target as RxSegmentedButton).textContent}`;
});
