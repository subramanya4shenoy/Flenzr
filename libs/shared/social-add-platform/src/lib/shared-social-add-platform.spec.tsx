import { render } from '@testing-library/react';

import SharedSocialAddPlatform from './shared-social-add-platform';

describe('SharedSocialAddPlatform', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedSocialAddPlatform />);
    expect(baseElement).toBeTruthy();
  });
});
