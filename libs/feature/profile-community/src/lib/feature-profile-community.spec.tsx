import { render } from '@testing-library/react';

import FeatureProfileCommunity from './feature-profile-community';

describe('FeatureProfileCommunity', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileCommunity />);
    expect(baseElement).toBeTruthy();
  });
});
