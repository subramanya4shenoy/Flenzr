import { render } from '@testing-library/react';

import SharedUiLoader from './shared-ui-loader';

describe('SharedUiLoader', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiLoader />);
    expect(baseElement).toBeTruthy();
  });
});
