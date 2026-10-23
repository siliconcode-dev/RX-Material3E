// Demo pages that exist. Add one entry per finished roadmap step.

export interface DemoPage {
  title: string;
  /** Path relative to /demo/. */
  href: string;
}

export interface DemoSection {
  title: string;
  pages: DemoPage[];
}

export const sections: DemoSection[] = [
  {
    title: 'Overview',
    pages: [{title: 'Catalog', href: 'index.html'}],
  },
  {
    title: 'Foundations',
    pages: [
      {title: 'Design tokens', href: 'tokens.html'},
      {title: 'Theme', href: 'theme.html'},
      {title: 'Typography', href: 'typography.html'},
      {title: 'Elevation', href: 'elevation.html'},
      {title: 'Focus ring', href: 'focus.html'},
    ],
  },
];
