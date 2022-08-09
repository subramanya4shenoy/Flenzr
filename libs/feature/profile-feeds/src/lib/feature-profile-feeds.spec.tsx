import { render } from '@testing-library/react';

import FeatureProfileFeeds from './feature-profile-feeds';

describe('FeatureProfileFeeds', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileFeeds />);
    expect(baseElement).toBeTruthy();
  });
});
