import { render } from '@testing-library/react';

import SharedUiLocations from './shared-ui-locations';

describe('SharedUiLocations', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiLocations />);
    expect(baseElement).toBeTruthy();
  });
});
