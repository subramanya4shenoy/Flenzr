import { render } from '@testing-library/react';

import FeatureProfileAbout from './feature-profile-about';

describe('FeatureProfileAbout', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileAbout />);
    expect(baseElement).toBeTruthy();
  });
});
