import { render } from '@testing-library/react';

import FeatureUserPostFeed from './feature-user-post-feed';

describe('FeatureUserPostFeed', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureUserPostFeed />);
    expect(baseElement).toBeTruthy();
  });
});
