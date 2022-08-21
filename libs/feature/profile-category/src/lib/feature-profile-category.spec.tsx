import { render } from '@testing-library/react';

import FeatureProfileCategory from './feature-profile-category';

describe('FeatureProfileCategory', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileCategory />);
    expect(baseElement).toBeTruthy();
  });
});
