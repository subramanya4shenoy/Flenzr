import { render } from '@testing-library/react';

import SharedSocialUnfollow from './shared-social-unfollow';

describe('SharedSocialUnfollow', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedSocialUnfollow />);
    expect(baseElement).toBeTruthy();
  });
});
