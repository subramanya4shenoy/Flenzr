import { render } from '@testing-library/react';

import FeatureStatsCard from './feature-stats-card';

describe('FeatureStatsCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsCard />);
    expect(baseElement).toBeTruthy();
  });
});
