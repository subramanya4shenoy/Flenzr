import { render } from '@testing-library/react';

import FeatureProfileBrands from './feature-profile-brands';

describe('FeatureProfileBrands', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileBrands />);
    expect(baseElement).toBeTruthy();
  });
});
