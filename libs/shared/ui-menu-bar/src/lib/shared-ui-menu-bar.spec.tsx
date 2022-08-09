import { render } from '@testing-library/react';

import SharedUiMenuBar from './shared-ui-menu-bar';

describe('SharedUiMenuBar', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiMenuBar />);
    expect(baseElement).toBeTruthy();
  });
});
