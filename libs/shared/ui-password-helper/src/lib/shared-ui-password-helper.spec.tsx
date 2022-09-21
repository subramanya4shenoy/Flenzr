import { render } from '@testing-library/react';

import SharedUiPasswordHelper from './shared-ui-password-helper';

describe('SharedUiPasswordHelper', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiPasswordHelper />);
    expect(baseElement).toBeTruthy();
  });
});
