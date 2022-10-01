import { render } from '@testing-library/react';

import SharedUiUtils from './shared-ui-utils';

describe('SharedUiUtils', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiUtils />);
    expect(baseElement).toBeTruthy();
  });
});
