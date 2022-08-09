import { render } from '@testing-library/react';

import SharedUiShellBar from './shared-ui-shell-bar';

describe('SharedUiShellBar', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiShellBar />);
    expect(baseElement).toBeTruthy();
  });
});
