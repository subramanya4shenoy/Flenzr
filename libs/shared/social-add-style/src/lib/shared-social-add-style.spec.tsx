import { render } from '@testing-library/react';

import SharedSocialAddStyle from './shared-social-add-style';

describe('SharedSocialAddStyle', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedSocialAddStyle />);
    expect(baseElement).toBeTruthy();
  });
});
