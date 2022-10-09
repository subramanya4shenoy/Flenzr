import { render } from '@testing-library/react';

import SharedWithAutherization from './shared-with-autherization';

describe('SharedWithAutherization', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedWithAutherization />);
    expect(baseElement).toBeTruthy();
  });
});
