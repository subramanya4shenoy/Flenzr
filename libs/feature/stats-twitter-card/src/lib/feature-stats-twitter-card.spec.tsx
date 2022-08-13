import { render } from '@testing-library/react';

import FeatureStatsTwitterCard from './feature-stats-twitter-card';

describe('FeatureStatsTwitterCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsTwitterCard />);
    expect(baseElement).toBeTruthy();
  });
});
