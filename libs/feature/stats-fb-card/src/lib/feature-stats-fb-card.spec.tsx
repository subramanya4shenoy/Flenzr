import { render } from '@testing-library/react';

import FeatureStatsFbCard from './feature-stats-fb-card';

describe('FeatureStatsFbCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureStatsFbCard />);
    expect(baseElement).toBeTruthy();
  });
});
