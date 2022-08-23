import { render } from '@testing-library/react';

import SharedUiBrandCard from './shared-ui-brand-card';

describe('SharedUiBrandCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiBrandCard />);
    expect(baseElement).toBeTruthy();
  });
});
