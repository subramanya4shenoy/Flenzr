import { render } from '@testing-library/react';

import SharedUiRating from './shared-ui-rating';

describe('SharedUiRating', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiRating />);
    expect(baseElement).toBeTruthy();
  });
});
