import { render } from '@testing-library/react';

import FeatureStatsYtCard from './feature-stats-yt-card';

describe('FeatureStatsYtCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsYtCard />);
    expect(baseElement).toBeTruthy();
  });
});
