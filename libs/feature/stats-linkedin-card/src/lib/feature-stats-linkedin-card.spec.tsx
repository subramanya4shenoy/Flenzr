import { render } from '@testing-library/react';

import FeatureStatsLinkedinCard from './feature-stats-linkedin-card';

describe('FeatureStatsLinkedinCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsLinkedinCard />);
    expect(baseElement).toBeTruthy();
  });
});
