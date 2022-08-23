import { render } from '@testing-library/react';

import FeatureProfileTargetLocation from './feature-profile-target-location';

describe('FeatureProfileTargetLocation', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileTargetLocation />);
    expect(baseElement).toBeTruthy();
  });
});
