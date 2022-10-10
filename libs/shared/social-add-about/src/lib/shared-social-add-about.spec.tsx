import { render } from '@testing-library/react';

import SharedSocialAddAbout from './shared-social-add-about';

describe('SharedSocialAddAbout', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedSocialAddAbout />);
    expect(baseElement).toBeTruthy();
  });
});
