import { render } from '@testing-library/react';

import FeatureFeedCard from './feature-feed-card';

describe('FeatureFeedCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureFeedCard />);
    expect(baseElement).toBeTruthy();
  });
});
