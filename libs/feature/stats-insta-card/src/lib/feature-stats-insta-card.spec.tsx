import { render } from '@testing-library/react';

import FeatureStatsInstaCard from './feature-stats-insta-card';

describe('FeatureStatsInstaCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsInstaCard />);
    expect(baseElement).toBeTruthy();
  });
});
